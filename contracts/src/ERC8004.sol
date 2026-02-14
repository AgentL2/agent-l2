// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title ERC8004 - Autonomous Agent Account
 * @notice A smart contract wallet that can be controlled by AI agents with configurable limits
 * @dev Implements delegated execution with spending limits, allowlists, and audit trails
 */
contract ERC8004 is Ownable, ReentrancyGuard {
    // ============ Structs ============
    
    struct AgentConfig {
        bool authorized;
        uint256 dailySpendingLimit;
        uint256 perTransactionLimit;
        uint256 totalSpentToday;
        uint256 lastResetTimestamp;
        address[] allowedContracts;
        bool allowAnyContract;
    }

    struct ActionLog {
        bytes32 agentDID;
        address target;
        bytes4 selector;
        uint256 value;
        bool success;
        uint256 timestamp;
    }

    // ============ State ============
    
    mapping(bytes32 => AgentConfig) public agents;
    mapping(bytes32 => mapping(address => bool)) public contractAllowlist;
    
    ActionLog[] public actionLogs;
    uint256 public constant MAX_BATCH_SIZE = 10;
    
    bool public paused;

    // Maps agent DID to the authorized signer address
    mapping(bytes32 => address) public agentSigner;

    // ============ Events ============
    
    event AgentAuthorized(
        bytes32 indexed agentDID,
        uint256 dailyLimit,
        uint256 perTxLimit,
        address[] allowedContracts
    );
    event AgentRevoked(bytes32 indexed agentDID);
    event SpendingLimitUpdated(bytes32 indexed agentDID, uint256 newDailyLimit, uint256 newPerTxLimit);
    event ContractAllowlistUpdated(bytes32 indexed agentDID, address[] contracts, bool allowed);
    event AgentAction(
        bytes32 indexed agentDID,
        address indexed target,
        bytes4 selector,
        uint256 value,
        bool success
    );
    event Paused(bool isPaused);
    event FundsDeposited(address indexed from, uint256 amount);
    event FundsWithdrawn(address indexed to, uint256 amount);

    // ============ Modifiers ============
    
    modifier whenNotPaused() {
        require(!paused, "ERC8004: paused");
        _;
    }

    modifier onlyAuthorizedAgent(bytes32 agentDID) {
        require(agents[agentDID].authorized, "ERC8004: agent not authorized");
        _;
    }

    // ============ Constructor ============
    
    constructor() Ownable(msg.sender) {}

    // ============ Owner Functions ============
    
    /**
     * @notice Authorize an agent with spending limits
     * @param agentDID The agent's decentralized identifier
     * @param dailyLimit Maximum ETH the agent can spend per day
     * @param perTxLimit Maximum ETH per single transaction
     * @param allowedContracts List of contracts the agent can interact with
     * @param allowAny If true, agent can interact with any contract
     */
    function authorizeAgent(
        bytes32 agentDID,
        uint256 dailyLimit,
        uint256 perTxLimit,
        address[] calldata allowedContracts,
        bool allowAny,
        address signer
    ) external onlyOwner {
        agents[agentDID] = AgentConfig({
            authorized: true,
            dailySpendingLimit: dailyLimit,
            perTransactionLimit: perTxLimit,
            totalSpentToday: 0,
            lastResetTimestamp: block.timestamp,
            allowedContracts: allowedContracts,
            allowAnyContract: allowAny
        });

        agentSigner[agentDID] = signer;

        // Update allowlist mapping for efficient lookups
        for (uint256 i = 0; i < allowedContracts.length; i++) {
            contractAllowlist[agentDID][allowedContracts[i]] = true;
        }

        emit AgentAuthorized(agentDID, dailyLimit, perTxLimit, allowedContracts);
    }

    /**
     * @notice Revoke an agent's authorization
     * @param agentDID The agent's decentralized identifier
     */
    function revokeAgent(bytes32 agentDID) external onlyOwner {
        require(agents[agentDID].authorized, "ERC8004: agent not authorized");
        
        // Clear allowlist
        address[] memory allowed = agents[agentDID].allowedContracts;
        for (uint256 i = 0; i < allowed.length; i++) {
            contractAllowlist[agentDID][allowed[i]] = false;
        }
        
        delete agents[agentDID];
        emit AgentRevoked(agentDID);
    }

    /**
     * @notice Update an agent's spending limits
     */
    function updateSpendingLimit(
        bytes32 agentDID,
        uint256 newDailyLimit,
        uint256 newPerTxLimit
    ) external onlyOwner onlyAuthorizedAgent(agentDID) {
        agents[agentDID].dailySpendingLimit = newDailyLimit;
        agents[agentDID].perTransactionLimit = newPerTxLimit;
        emit SpendingLimitUpdated(agentDID, newDailyLimit, newPerTxLimit);
    }

    /**
     * @notice Update an agent's contract allowlist
     */
    function setAllowedContracts(
        bytes32 agentDID,
        address[] calldata contracts,
        bool allowed
    ) external onlyOwner onlyAuthorizedAgent(agentDID) {
        for (uint256 i = 0; i < contracts.length; i++) {
            contractAllowlist[agentDID][contracts[i]] = allowed;
            if (allowed) {
                agents[agentDID].allowedContracts.push(contracts[i]);
            }
        }
        emit ContractAllowlistUpdated(agentDID, contracts, allowed);
    }

    /**
     * @notice Pause/unpause all agent actions
     */
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit Paused(_paused);
    }

    /**
     * @notice Withdraw funds from the account
     */
    function withdraw(address payable to, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "ERC8004: insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "ERC8004: withdrawal failed");
        emit FundsWithdrawn(to, amount);
    }

    // ============ Agent Execution ============
    
    /**
     * @notice Execute a transaction as an authorized agent
     * @param agentDID The agent's DID (caller must prove ownership off-chain)
     * @param target The contract to call
     * @param data The calldata
     * @param value The ETH value to send
     */
    function executeAsAgent(
        bytes32 agentDID,
        address target,
        bytes calldata data,
        uint256 value
    ) external whenNotPaused onlyAuthorizedAgent(agentDID) nonReentrant returns (bytes memory) {
        // Verify the caller is the authorized signer for this agent
        require(msg.sender == agentSigner[agentDID], "ERC8004: caller not authorized signer");
        
        _validateAgentAction(agentDID, target, value);
        _updateSpending(agentDID, value);

        (bool success, bytes memory result) = target.call{value: value}(data);
        
        bytes4 selector = bytes4(data[:4]);
        _logAction(agentDID, target, selector, value, success);

        if (!success) {
            // Bubble up the revert reason
            if (result.length > 0) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
            revert("ERC8004: execution failed");
        }

        return result;
    }

    /**
     * @notice Execute multiple transactions as an agent
     */
    function batchExecuteAsAgent(
        bytes32 agentDID,
        address[] calldata targets,
        bytes[] calldata data,
        uint256[] calldata values
    ) external whenNotPaused onlyAuthorizedAgent(agentDID) nonReentrant returns (bytes[] memory) {
        require(targets.length == data.length && targets.length == values.length, "ERC8004: array length mismatch");
        require(targets.length <= MAX_BATCH_SIZE, "ERC8004: batch too large");
        require(msg.sender == agentSigner[agentDID], "ERC8004: caller not authorized signer");

        uint256 totalValue = 0;
        for (uint256 i = 0; i < values.length; i++) {
            totalValue += values[i];
        }
        
        _validateAgentAction(agentDID, address(0), totalValue); // Validate total spending
        _updateSpending(agentDID, totalValue);

        bytes[] memory results = new bytes[](targets.length);
        
        for (uint256 i = 0; i < targets.length; i++) {
            require(
                agents[agentDID].allowAnyContract || contractAllowlist[agentDID][targets[i]],
                "ERC8004: contract not allowed"
            );

            (bool success, bytes memory result) = targets[i].call{value: values[i]}(data[i]);
            bytes4 selector = data[i].length >= 4 ? bytes4(data[i][:4]) : bytes4(0);
            _logAction(agentDID, targets[i], selector, values[i], success);

            require(success, "ERC8004: batch execution failed");
            results[i] = result;
        }

        return results;
    }

    // ============ Internal Functions ============
    
    function _validateAgentAction(bytes32 agentDID, address target, uint256 value) internal view {
        AgentConfig storage agent = agents[agentDID];
        
        require(value <= agent.perTransactionLimit, "ERC8004: exceeds per-tx limit");
        
        // Reset daily spending if new day
        uint256 spentToday = agent.totalSpentToday;
        if (block.timestamp >= agent.lastResetTimestamp + 1 days) {
            spentToday = 0;
        }
        
        require(spentToday + value <= agent.dailySpendingLimit, "ERC8004: exceeds daily limit");
        
        if (target != address(0)) {
            require(
                agent.allowAnyContract || contractAllowlist[agentDID][target],
                "ERC8004: contract not allowed"
            );
        }
    }

    function _updateSpending(bytes32 agentDID, uint256 value) internal {
        AgentConfig storage agent = agents[agentDID];
        
        // Reset daily counter if new day
        if (block.timestamp >= agent.lastResetTimestamp + 1 days) {
            agent.totalSpentToday = 0;
            agent.lastResetTimestamp = block.timestamp;
        }
        
        agent.totalSpentToday += value;
    }

    function _logAction(
        bytes32 agentDID,
        address target,
        bytes4 selector,
        uint256 value,
        bool success
    ) internal {
        actionLogs.push(ActionLog({
            agentDID: agentDID,
            target: target,
            selector: selector,
            value: value,
            success: success,
            timestamp: block.timestamp
        }));
        
        emit AgentAction(agentDID, target, selector, value, success);
    }

    // ============ View Functions ============
    
    function isAgentAuthorized(bytes32 agentDID) external view returns (bool) {
        return agents[agentDID].authorized;
    }

    function getAgentConfig(bytes32 agentDID) external view returns (
        bool authorized,
        uint256 dailyLimit,
        uint256 perTxLimit,
        uint256 spentToday,
        bool allowAny
    ) {
        AgentConfig storage agent = agents[agentDID];
        uint256 spent = agent.totalSpentToday;
        
        // Reset if new day
        if (block.timestamp >= agent.lastResetTimestamp + 1 days) {
            spent = 0;
        }
        
        return (
            agent.authorized,
            agent.dailySpendingLimit,
            agent.perTransactionLimit,
            spent,
            agent.allowAnyContract
        );
    }

    function getAllowedContracts(bytes32 agentDID) external view returns (address[] memory) {
        return agents[agentDID].allowedContracts;
    }

    function getActionLogsCount() external view returns (uint256) {
        return actionLogs.length;
    }

    function getActionLogs(uint256 offset, uint256 limit) external view returns (ActionLog[] memory) {
        uint256 end = offset + limit;
        if (end > actionLogs.length) {
            end = actionLogs.length;
        }
        
        ActionLog[] memory logs = new ActionLog[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            logs[i - offset] = actionLogs[i];
        }
        return logs;
    }

    // ============ Receive ETH ============
    
    receive() external payable {
        emit FundsDeposited(msg.sender, msg.value);
    }
}
