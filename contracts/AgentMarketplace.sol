// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AgentRegistry.sol";

/**
 * @title AgentMarketplace
 * @notice Marketplace for AI agents to offer and consume services (escrow, payments, disputes).
 * @dev Safe for agents and humans: CEI pattern, reentrancy guards, and dispute resolution.
 */
contract AgentMarketplace is ReentrancyGuard {
    // -------------------------------------------------------------------------
    // Constants (audit-friendly)
    // -------------------------------------------------------------------------
    uint256 public constant BPS_DENOMINATOR = 10000;

    AgentRegistry public registry;
    uint256 public protocolFeeBps = 250;
    address public feeCollector;
    uint256 public collectedFees;

    // -------------------------------------------------------------------------
    // Errors
    // -------------------------------------------------------------------------
    error ServiceNotActive();
    error InvalidDeadline();
    error InsufficientPayment();
    error NotSeller();
    error OrderNotPending();
    error DeadlinePassed();
    error NotBuyer();
    error CannotDispute();
    error NotDisputed();
    error NotFeeCollector();
    error PayeeNotActiveAgent();
    error MustDepositFunds();
    error InvalidRate();
    error NotPayee();
    error StreamNotActive();
    error NotPayer();

    enum OrderStatus { Pending, Completed, Disputed, Cancelled, Refunded, DisputeResolved }

    struct ServiceOrder {
        bytes32 serviceId;
        address buyer;
        address seller;
        uint256 units;
        uint256 totalPrice;
        uint256 createdAt;
        uint256 deadline;
        OrderStatus status;
        string resultURI;
        bytes resultHash;
    }

    struct StreamingPayment {
        address payer;
        address payee;
        uint256 ratePerSecond;
        uint256 startTime;
        uint256 lastClaimed;
        uint256 balance;
        bool active;
    }

    mapping(bytes32 => ServiceOrder) public orders;
    mapping(bytes32 => StreamingPayment) public streams;
    mapping(address => bytes32[]) public agentOrders;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    event OrderCreated(bytes32 indexed orderId, bytes32 indexed serviceId, address buyer, address seller, uint256 totalPrice);
    event OrderCompleted(bytes32 indexed orderId, string resultURI);
    event OrderDisputed(bytes32 indexed orderId, string reason);
    event OrderCancelled(bytes32 indexed orderId);
    event OrderRefunded(bytes32 indexed orderId, uint256 amount);
    event OrderDisputeResolved(bytes32 indexed orderId, bool refundBuyer);
    event StreamStarted(bytes32 indexed streamId, address indexed payer, address indexed payee, uint256 ratePerSecond);
    event StreamClaimed(bytes32 indexed streamId, uint256 amount);
    event StreamStopped(bytes32 indexed streamId);

    constructor(address _registry, address _feeCollector) {
        registry = AgentRegistry(_registry);
        feeCollector = _feeCollector;
    }

    // -------------------------------------------------------------------------
    // Orders (CEI: checks, effects, interactions)
    // -------------------------------------------------------------------------

    /**
     * @notice Create a service order with escrow (payment held until complete or refund).
     * @param serviceId The service being purchased.
     * @param units Number of units (tokens, seconds, etc.).
     * @param deadline Timestamp by which service must be delivered.
     */
    function createOrder(
        bytes32 serviceId,
        uint256 units,
        uint256 deadline
    ) external payable nonReentrant returns (bytes32 orderId) {
        (address agent, , uint256 pricePerUnit, , bool active) = registry.services(serviceId);
        if (!active) revert ServiceNotActive();
        if (deadline <= block.timestamp) revert InvalidDeadline();

        uint256 totalPrice = pricePerUnit * units;
        if (msg.value < totalPrice) revert InsufficientPayment();

        orderId = keccak256(abi.encodePacked(
            serviceId,
            msg.sender,
            block.timestamp,
            agentOrders[msg.sender].length
        ));

        orders[orderId] = ServiceOrder({
            serviceId: serviceId,
            buyer: msg.sender,
            seller: agent,
            units: units,
            totalPrice: totalPrice,
            createdAt: block.timestamp,
            deadline: deadline,
            status: OrderStatus.Pending,
            resultURI: "",
            resultHash: ""
        });

        agentOrders[msg.sender].push(orderId);
        agentOrders[agent].push(orderId);

        if (msg.value > totalPrice) {
            (bool ok,) = payable(msg.sender).call{ value: msg.value - totalPrice }("");
            require(ok, "Refund failed");
        }

        emit OrderCreated(orderId, serviceId, msg.sender, agent, totalPrice);
        return orderId;
    }

    /**
     * @notice Seller completes an order and provides result; payment released to seller (minus fee).
     */
    function completeOrder(
        bytes32 orderId,
        string calldata resultURI,
        bytes calldata resultHash
    ) external nonReentrant {
        ServiceOrder storage order = orders[orderId];
        if (order.seller != msg.sender) revert NotSeller();
        if (order.status != OrderStatus.Pending) revert OrderNotPending();
        if (block.timestamp > order.deadline) revert DeadlinePassed();

        uint256 totalPrice = order.totalPrice;
        uint256 protocolFee = (totalPrice * protocolFeeBps) / BPS_DENOMINATOR;
        uint256 sellerAmount = totalPrice - protocolFee;

        order.resultURI = resultURI;
        order.resultHash = resultHash;
        order.status = OrderStatus.Completed;
        collectedFees += protocolFee;

        (bool ok,) = payable(order.seller).call{ value: sellerAmount }("");
        require(ok, "Transfer failed");

        registry.recordEarnings(order.seller, sellerAmount);
        registry.recordSpending(order.buyer, totalPrice);

        emit OrderCompleted(orderId, resultURI);
    }

    /**
     * @notice Buyer disputes an order (only while Pending, before completion).
     * @dev Resolution via resolveDispute (fee collector).
     */
    function disputeOrder(bytes32 orderId, string calldata reason) external {
        ServiceOrder storage order = orders[orderId];
        if (order.buyer != msg.sender) revert NotBuyer();
        if (order.status != OrderStatus.Pending) revert CannotDispute();

        order.status = OrderStatus.Disputed;
        emit OrderDisputed(orderId, reason);
    }

    /**
     * @notice Resolve a disputed order (fee collector only): refund buyer or reject dispute.
     * @param orderId The disputed order.
     * @param refundBuyer If true, refund full order amount to buyer; else dispute rejected (seller can still complete).
     */
    function resolveDispute(bytes32 orderId, bool refundBuyer) external nonReentrant {
        ServiceOrder storage order = orders[orderId];
        if (msg.sender != feeCollector) revert NotFeeCollector();
        if (order.status != OrderStatus.Disputed) revert NotDisputed();

        if (refundBuyer) {
            uint256 amount = order.totalPrice;
            order.status = OrderStatus.Refunded;
            (bool ok,) = payable(order.buyer).call{ value: amount }("");
            require(ok, "Refund failed");
            emit OrderRefunded(orderId, amount);
        } else {
            order.status = OrderStatus.Pending;
        }

        emit OrderDisputeResolved(orderId, refundBuyer);
    }

    /**
     * @notice Buyer cancels a pending order before deadline; full refund.
     */
    function cancelOrder(bytes32 orderId) external nonReentrant {
        ServiceOrder storage order = orders[orderId];
        if (order.buyer != msg.sender) revert NotBuyer();
        if (order.status != OrderStatus.Pending) revert OrderNotPending();
        if (block.timestamp > order.deadline) revert DeadlinePassed();

        order.status = OrderStatus.Cancelled;
        uint256 amount = order.totalPrice;

        (bool ok,) = payable(order.buyer).call{ value: amount }("");
        require(ok, "Refund failed");

        emit OrderCancelled(orderId);
    }

    // -------------------------------------------------------------------------
    // Streaming payments
    // -------------------------------------------------------------------------

    function startStream(address payee, uint256 ratePerSecond) external payable returns (bytes32 streamId) {
        if (!registry.isActiveAgent(payee)) revert PayeeNotActiveAgent();
        if (msg.value == 0) revert MustDepositFunds();
        if (ratePerSecond == 0) revert InvalidRate();

        streamId = keccak256(abi.encodePacked(msg.sender, payee, block.timestamp));

        streams[streamId] = StreamingPayment({
            payer: msg.sender,
            payee: payee,
            ratePerSecond: ratePerSecond,
            startTime: block.timestamp,
            lastClaimed: block.timestamp,
            balance: msg.value,
            active: true
        });

        emit StreamStarted(streamId, msg.sender, payee, ratePerSecond);
        return streamId;
    }

    function claimStream(bytes32 streamId) external nonReentrant {
        StreamingPayment storage stream = streams[streamId];
        if (stream.payee != msg.sender) revert NotPayee();
        if (!stream.active) revert StreamNotActive();

        uint256 elapsed = block.timestamp - stream.lastClaimed;
        uint256 amount = elapsed * stream.ratePerSecond;

        if (amount > stream.balance) {
            amount = stream.balance;
            stream.active = false;
        }

        stream.balance -= amount;
        stream.lastClaimed = block.timestamp;

        uint256 protocolFee = (amount * protocolFeeBps) / BPS_DENOMINATOR;
        uint256 payeeAmount = amount - protocolFee;
        collectedFees += protocolFee;

        (bool ok,) = payable(stream.payee).call{ value: payeeAmount }("");
        require(ok, "Transfer failed");

        registry.recordEarnings(stream.payee, payeeAmount);

        emit StreamClaimed(streamId, payeeAmount);
    }

    function stopStream(bytes32 streamId) external nonReentrant {
        StreamingPayment storage stream = streams[streamId];
        if (stream.payer != msg.sender) revert NotPayer();
        if (!stream.active) revert StreamNotActive();

        uint256 elapsed = block.timestamp - stream.lastClaimed;
        uint256 owedAmount = elapsed * stream.ratePerSecond;
        if (owedAmount > stream.balance) owedAmount = stream.balance;

        uint256 refundAmount = stream.balance - owedAmount;

        if (owedAmount > 0) {
            uint256 protocolFee = (owedAmount * protocolFeeBps) / BPS_DENOMINATOR;
            uint256 payeeAmount = owedAmount - protocolFee;
            collectedFees += protocolFee;
            (bool ok,) = payable(stream.payee).call{ value: payeeAmount }("");
            require(ok, "Transfer failed");
            registry.recordEarnings(stream.payee, payeeAmount);
        }

        if (refundAmount > 0) {
            (bool ok,) = payable(stream.payer).call{ value: refundAmount }("");
            require(ok, "Refund failed");
        }

        stream.active = false;
        stream.balance = 0;

        emit StreamStopped(streamId);
    }

    // -------------------------------------------------------------------------
    // Fee collector
    // -------------------------------------------------------------------------

    function withdrawFees() external nonReentrant {
        if (msg.sender != feeCollector) revert NotFeeCollector();
        uint256 amount = collectedFees;
        collectedFees = 0;
        (bool ok,) = payable(feeCollector).call{ value: amount }("");
        require(ok, "Transfer failed");
    }

    function getAgentOrders(address agent) external view returns (bytes32[] memory) {
        return agentOrders[agent];
    }
}
