// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AgentRegistry
 * @notice Core registry for AI agents on the L2 network (identity, services, reputation).
 * @dev Safe for agents and humans: input validation, access control, and gas caps on strings.
 */
contract AgentRegistry is Ownable, Pausable {
    using ECDSA for bytes32;

    // -------------------------------------------------------------------------
    // Constants (audit-friendly)
    // -------------------------------------------------------------------------
    uint256 public constant REPUTATION_BPS_MAX = 10000;
    uint256 public constant REPUTATION_DEFAULT_BPS = 5000;
    uint256 public constant STRING_MAX_LENGTH = 512;

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------
    error AgentAlreadyRegistered();
    error InvalidAgentAddress();
    error NotAgentOwner();
    error AgentNotActive();
    error InvalidReputationScore();
    error StringTooLong();

    struct Agent {
        address owner;
        string did;
        string metadataURI;
        uint256 reputationScore;
        uint256 totalEarned;
        uint256 totalSpent;
        uint256 registeredAt;
        bool active;
    }

    struct Service {
        address agent;
        string serviceType;
        uint256 pricePerUnit;
        string metadataURI;
        bool active;
    }

    mapping(address => Agent) public agents;
    mapping(bytes32 => Service) public services;
    mapping(address => bytes32[]) public agentServices;
    address[] public allAgents;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event AgentRegistered(address indexed agent, string did, address owner);
    event AgentUpdated(address indexed agent, string metadataURI);
    event AgentDeactivated(address indexed agent);
    event ServiceRegistered(bytes32 indexed serviceId, address indexed agent, string serviceType);
    event ServiceUpdated(bytes32 indexed serviceId, uint256 newPrice);
    event ServiceDeactivated(bytes32 indexed serviceId);
    event ReputationUpdated(address indexed agent, uint256 newScore);
    event EarningsRecorded(address indexed agent, uint256 amount);
    event SpendingRecorded(address indexed agent, uint256 amount);

    constructor() Ownable(msg.sender) {}

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /**
     * @notice Register a new AI agent.
     * @param agent The agent's address (derived from its key pair).
     * @param did Decentralized Identifier (e.g. did:key:z6Mk...).
     * @param metadataURI IPFS URI with agent capabilities (max length enforced).
     */
    function registerAgent(
        address agent,
        string calldata did,
        string calldata metadataURI
    ) external whenNotPaused {
        if (agents[agent].registeredAt != 0) revert AgentAlreadyRegistered();
        if (agent == address(0)) revert InvalidAgentAddress();
        if (bytes(did).length > STRING_MAX_LENGTH || bytes(metadataURI).length > STRING_MAX_LENGTH) revert StringTooLong();

        agents[agent] = Agent({
            owner: msg.sender,
            did: did,
            metadataURI: metadataURI,
            reputationScore: REPUTATION_DEFAULT_BPS,
            totalEarned: 0,
            totalSpent: 0,
            registeredAt: block.timestamp,
            active: true
        });

        allAgents.push(agent);

        emit AgentRegistered(agent, did, msg.sender);
    }

    /**
     * @notice Update agent metadata (owner only).
     */
    function updateAgent(address agent, string calldata metadataURI) external {
        if (agents[agent].owner != msg.sender) revert NotAgentOwner();
        if (bytes(metadataURI).length > STRING_MAX_LENGTH) revert StringTooLong();
        agents[agent].metadataURI = metadataURI;
        emit AgentUpdated(agent, metadataURI);
    }

    /**
     * @notice Deactivate an agent (owner only); agent can no longer provide services.
     */
    function deactivateAgent(address agent) external {
        if (agents[agent].owner != msg.sender) revert NotAgentOwner();
        agents[agent].active = false;
        emit AgentDeactivated(agent);
    }

    /**
     * @notice Register a service offered by an agent.
     * @param agent The agent providing the service.
     * @param serviceType Category/type of service.
     * @param pricePerUnit Price in wei per unit.
     * @param metadataURI Service details (max length enforced).
     */
    function registerService(
        address agent,
        string calldata serviceType,
        uint256 pricePerUnit,
        string calldata metadataURI
    ) external whenNotPaused returns (bytes32 serviceId) {
        if (!agents[agent].active) revert AgentNotActive();
        if (agents[agent].owner != msg.sender) revert NotAgentOwner();
        if (bytes(serviceType).length > STRING_MAX_LENGTH || bytes(metadataURI).length > STRING_MAX_LENGTH) revert StringTooLong();

        serviceId = keccak256(abi.encodePacked(
            agent,
            serviceType,
            block.timestamp,
            agentServices[agent].length
        ));

        services[serviceId] = Service({
            agent: agent,
            serviceType: serviceType,
            pricePerUnit: pricePerUnit,
            metadataURI: metadataURI,
            active: true
        });

        agentServices[agent].push(serviceId);

        emit ServiceRegistered(serviceId, agent, serviceType);
        return serviceId;
    }

    /**
     * @notice Update service pricing (service owner only).
     */
    function updateServicePrice(bytes32 serviceId, uint256 newPrice) external {
        Service storage service = services[serviceId];
        if (agents[service.agent].owner != msg.sender) revert NotAgentOwner();
        service.pricePerUnit = newPrice;
        emit ServiceUpdated(serviceId, newPrice);
    }

    /**
     * @notice Deactivate a service (service owner only).
     */
    function deactivateService(bytes32 serviceId) external {
        Service storage service = services[serviceId];
        if (agents[service.agent].owner != msg.sender) revert NotAgentOwner();
        service.active = false;
        emit ServiceDeactivated(serviceId);
    }

    /**
     * @notice Record earnings for an agent (called by marketplace only).
     */
    function recordEarnings(address agent, uint256 amount) external onlyOwner {
        agents[agent].totalEarned += amount;
        emit EarningsRecorded(agent, amount);
    }

    /**
     * @notice Record spending by an agent (called by marketplace only).
     */
    function recordSpending(address agent, uint256 amount) external onlyOwner {
        agents[agent].totalSpent += amount;
        emit SpendingRecorded(agent, amount);
    }

    /**
     * @notice Update reputation score (owner/marketplace only). 0–10000 basis points.
     */
    function updateReputation(address agent, uint256 newScore) external onlyOwner {
        if (newScore > REPUTATION_BPS_MAX) revert InvalidReputationScore();
        agents[agent].reputationScore = newScore;
        emit ReputationUpdated(agent, newScore);
    }

    /**
     * @notice Get all service IDs offered by an agent.
     */
    function getAgentServices(address agent) external view returns (bytes32[] memory) {
        return agentServices[agent];
    }

    /**
     * @notice Get total number of registered agents.
     */
    function getAgentCount() external view returns (uint256) {
        return allAgents.length;
    }

    /**
     * @notice Check if an agent is registered and active.
     */
    function isActiveAgent(address agent) external view returns (bool) {
        return agents[agent].active && agents[agent].registeredAt > 0;
    }
}
