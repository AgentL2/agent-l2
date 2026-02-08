// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title FastBridge - Instant Multi-Chain Bridge with Points
 * @notice Bridge assets to AgentL2 instantly and earn points for future airdrop
 * @dev Liquidity pool model for instant swaps, no 7-day delays
 */
contract FastBridge is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Structs ============
    
    struct BridgeStats {
        uint256 totalBridged;      // Total value bridged (in ETH equivalent)
        uint256 bridgeCount;       // Number of bridge transactions
        uint256 points;            // Accumulated points
        uint256 firstBridgeTime;   // Timestamp of first bridge
        uint256 lastBridgeTime;    // Timestamp of last bridge
        uint8 tier;                // User tier (0-4)
    }

    struct SupportedToken {
        bool enabled;
        address priceFeed;         // Chainlink price feed
        uint256 minAmount;
        uint256 maxAmount;
        uint256 pointsMultiplier;  // 100 = 1x, 150 = 1.5x
    }

    // ============ Constants ============
    
    uint256 public constant POINTS_PER_ETH = 1000;           // Base: 1000 points per 1 ETH bridged
    uint256 public constant EARLY_BIRD_BONUS = 200;          // +20% for first 1000 users
    uint256 public constant STREAK_BONUS = 50;               // +5% per consecutive day (max 7)
    uint256 public constant AGENT_BONUS = 100;               // +10% if bridging for an agent
    
    uint256 public constant TIER_BRONZE = 10_000;            // 10K points
    uint256 public constant TIER_SILVER = 50_000;            // 50K points  
    uint256 public constant TIER_GOLD = 200_000;             // 200K points
    uint256 public constant TIER_PLATINUM = 1_000_000;       // 1M points
    
    uint256 public constant REFERRAL_BONUS = 100;            // +10% for referrer
    uint256 public constant REFEREE_BONUS = 50;              // +5% for referee

    // ============ State ============
    
    mapping(address => BridgeStats) public userStats;
    mapping(address => SupportedToken) public supportedTokens;
    mapping(address => address) public referrers;            // user => referrer
    mapping(address => uint256) public referralCount;
    
    address[] public allUsers;
    mapping(address => bool) public isUser;
    
    uint256 public totalPoints;
    uint256 public totalBridgedVolume;
    uint256 public userCount;
    
    uint256 public bridgeFee = 10;  // 0.1% fee (basis points)
    address public feeRecipient;
    address public liquidityPool;
    
    bool public earlyBirdActive = true;
    uint256 public earlyBirdCutoff = 1000;

    // ============ Events ============
    
    event BridgeDeposit(
        address indexed user,
        address indexed token,
        uint256 amount,
        uint256 amountOut,
        uint256 pointsEarned,
        uint256 totalPoints
    );
    event PointsEarned(address indexed user, uint256 points, string reason);
    event TierUpgrade(address indexed user, uint8 newTier);
    event ReferralSet(address indexed user, address indexed referrer);
    event TokenAdded(address indexed token, uint256 pointsMultiplier);
    event TokenRemoved(address indexed token);

    // ============ Constructor ============
    
    constructor(address _liquidityPool, address _feeRecipient) Ownable(msg.sender) {
        liquidityPool = _liquidityPool;
        feeRecipient = _feeRecipient;
        
        // ETH is always supported (address(0))
        supportedTokens[address(0)] = SupportedToken({
            enabled: true,
            priceFeed: address(0),
            minAmount: 0.001 ether,
            maxAmount: 100 ether,
            pointsMultiplier: 100
        });
    }

    // ============ Bridge Functions ============
    
    /**
     * @notice Bridge ETH to AgentL2
     * @param referrer Optional referrer address
     */
    function bridgeETH(address referrer) external payable nonReentrant {
        require(msg.value >= supportedTokens[address(0)].minAmount, "Below minimum");
        require(msg.value <= supportedTokens[address(0)].maxAmount, "Above maximum");
        
        _processReferral(msg.sender, referrer);
        
        uint256 fee = (msg.value * bridgeFee) / 10000;
        uint256 amountOut = msg.value - fee;
        
        // Send fee
        if (fee > 0) {
            (bool feeSuccess, ) = feeRecipient.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }
        
        // Send to liquidity pool (which handles L2 minting)
        (bool success, ) = liquidityPool.call{value: amountOut}("");
        require(success, "Bridge transfer failed");
        
        // Calculate and award points
        uint256 points = _calculatePoints(msg.sender, msg.value, address(0), false);
        _awardPoints(msg.sender, points, "bridge_eth");
        
        emit BridgeDeposit(msg.sender, address(0), msg.value, amountOut, points, userStats[msg.sender].points);
    }

    /**
     * @notice Bridge ERC20 tokens to AgentL2
     * @param token Token address
     * @param amount Amount to bridge
     * @param referrer Optional referrer address
     */
    function bridgeToken(address token, uint256 amount, address referrer) external nonReentrant {
        require(supportedTokens[token].enabled, "Token not supported");
        require(amount >= supportedTokens[token].minAmount, "Below minimum");
        require(amount <= supportedTokens[token].maxAmount, "Above maximum");
        
        _processReferral(msg.sender, referrer);
        
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        uint256 fee = (amount * bridgeFee) / 10000;
        uint256 amountOut = amount - fee;
        
        // Send fee
        if (fee > 0) {
            IERC20(token).safeTransfer(feeRecipient, fee);
        }
        
        // Send to liquidity pool
        IERC20(token).safeTransfer(liquidityPool, amountOut);
        
        // Calculate ETH equivalent for points (simplified - would use Chainlink in production)
        uint256 ethEquivalent = _getEthEquivalent(token, amount);
        uint256 points = _calculatePoints(msg.sender, ethEquivalent, token, false);
        _awardPoints(msg.sender, points, "bridge_token");
        
        emit BridgeDeposit(msg.sender, token, amount, amountOut, points, userStats[msg.sender].points);
    }

    /**
     * @notice Bridge for an agent (extra bonus points)
     * @param agentAddress The agent's address on L2
     */
    function bridgeForAgent(address agentAddress) external payable nonReentrant {
        require(msg.value >= supportedTokens[address(0)].minAmount, "Below minimum");
        require(agentAddress != address(0), "Invalid agent");
        
        uint256 fee = (msg.value * bridgeFee) / 10000;
        uint256 amountOut = msg.value - fee;
        
        if (fee > 0) {
            (bool feeSuccess, ) = feeRecipient.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }
        
        (bool success, ) = liquidityPool.call{value: amountOut}("");
        require(success, "Bridge transfer failed");
        
        // Extra points for agent funding
        uint256 points = _calculatePoints(msg.sender, msg.value, address(0), true);
        _awardPoints(msg.sender, points, "bridge_for_agent");
        
        emit BridgeDeposit(msg.sender, address(0), msg.value, amountOut, points, userStats[msg.sender].points);
    }

    // ============ Internal Functions ============
    
    function _processReferral(address user, address referrer) internal {
        if (referrer != address(0) && referrers[user] == address(0) && referrer != user) {
            referrers[user] = referrer;
            referralCount[referrer]++;
            emit ReferralSet(user, referrer);
        }
    }

    function _calculatePoints(
        address user,
        uint256 ethAmount,
        address token,
        bool isAgentFunding
    ) internal view returns (uint256) {
        // Base points
        uint256 points = (ethAmount * POINTS_PER_ETH) / 1 ether;
        
        // Token multiplier
        if (token != address(0) && supportedTokens[token].pointsMultiplier > 0) {
            points = (points * supportedTokens[token].pointsMultiplier) / 100;
        }
        
        // Early bird bonus (first 1000 users)
        if (earlyBirdActive && userCount < earlyBirdCutoff && !isUser[user]) {
            points = (points * (100 + EARLY_BIRD_BONUS)) / 100;
        }
        
        // Agent funding bonus
        if (isAgentFunding) {
            points = (points * (100 + AGENT_BONUS)) / 100;
        }
        
        // Streak bonus (consecutive days)
        uint256 streakDays = _getStreakDays(user);
        if (streakDays > 0) {
            uint256 streakBonus = streakDays * STREAK_BONUS;
            if (streakBonus > 350) streakBonus = 350; // Cap at 7 days (35%)
            points = (points * (100 + streakBonus)) / 100;
        }
        
        // Tier bonus
        uint8 tier = userStats[user].tier;
        if (tier > 0) {
            uint256 tierBonus = tier * 25; // 2.5% per tier
            points = (points * (100 + tierBonus)) / 100;
        }
        
        return points;
    }

    function _awardPoints(address user, uint256 points, string memory reason) internal {
        // Register new user
        if (!isUser[user]) {
            isUser[user] = true;
            allUsers.push(user);
            userCount++;
            userStats[user].firstBridgeTime = block.timestamp;
        }
        
        // Update stats
        userStats[user].points += points;
        userStats[user].bridgeCount++;
        userStats[user].lastBridgeTime = block.timestamp;
        totalPoints += points;
        
        emit PointsEarned(user, points, reason);
        
        // Check tier upgrade
        _checkTierUpgrade(user);
        
        // Referral rewards
        address referrer = referrers[user];
        if (referrer != address(0)) {
            uint256 referrerBonus = (points * REFERRAL_BONUS) / 1000; // 10%
            userStats[referrer].points += referrerBonus;
            totalPoints += referrerBonus;
            emit PointsEarned(referrer, referrerBonus, "referral_bonus");
        }
    }

    function _checkTierUpgrade(address user) internal {
        uint256 points = userStats[user].points;
        uint8 currentTier = userStats[user].tier;
        uint8 newTier = currentTier;
        
        if (points >= TIER_PLATINUM) newTier = 4;
        else if (points >= TIER_GOLD) newTier = 3;
        else if (points >= TIER_SILVER) newTier = 2;
        else if (points >= TIER_BRONZE) newTier = 1;
        
        if (newTier > currentTier) {
            userStats[user].tier = newTier;
            emit TierUpgrade(user, newTier);
        }
    }

    function _getStreakDays(address user) internal view returns (uint256) {
        uint256 lastBridge = userStats[user].lastBridgeTime;
        if (lastBridge == 0) return 0;
        
        uint256 daysSinceLast = (block.timestamp - lastBridge) / 1 days;
        if (daysSinceLast > 1) return 0; // Streak broken
        
        // Count consecutive days (simplified - would need more tracking in production)
        return userStats[user].bridgeCount > 7 ? 7 : userStats[user].bridgeCount;
    }

    function _getEthEquivalent(address token, uint256 amount) internal view returns (uint256) {
        // Simplified - in production, use Chainlink price feeds
        // For now, assume 1:1 for stablecoins, adjust for others
        return amount; // Placeholder
    }

    // ============ View Functions ============
    
    function getUserStats(address user) external view returns (
        uint256 totalBridged,
        uint256 bridgeCount,
        uint256 points,
        uint8 tier,
        uint256 rank
    ) {
        BridgeStats memory stats = userStats[user];
        return (
            stats.totalBridged,
            stats.bridgeCount,
            stats.points,
            stats.tier,
            _getUserRank(user)
        );
    }

    function _getUserRank(address user) internal view returns (uint256) {
        uint256 userPoints = userStats[user].points;
        uint256 rank = 1;
        
        for (uint256 i = 0; i < allUsers.length; i++) {
            if (userStats[allUsers[i]].points > userPoints) {
                rank++;
            }
        }
        return rank;
    }

    function getLeaderboard(uint256 limit) external view returns (
        address[] memory users,
        uint256[] memory points
    ) {
        uint256 count = limit > allUsers.length ? allUsers.length : limit;
        users = new address[](count);
        points = new uint256[](count);
        
        // Simple bubble sort for small leaderboards
        address[] memory sorted = new address[](allUsers.length);
        for (uint256 i = 0; i < allUsers.length; i++) {
            sorted[i] = allUsers[i];
        }
        
        for (uint256 i = 0; i < sorted.length; i++) {
            for (uint256 j = i + 1; j < sorted.length; j++) {
                if (userStats[sorted[j]].points > userStats[sorted[i]].points) {
                    (sorted[i], sorted[j]) = (sorted[j], sorted[i]);
                }
            }
        }
        
        for (uint256 i = 0; i < count; i++) {
            users[i] = sorted[i];
            points[i] = userStats[sorted[i]].points;
        }
        
        return (users, points);
    }

    function getTierName(uint8 tier) external pure returns (string memory) {
        if (tier == 0) return "Starter";
        if (tier == 1) return "Bronze";
        if (tier == 2) return "Silver";
        if (tier == 3) return "Gold";
        if (tier == 4) return "Platinum";
        return "Unknown";
    }

    function getPointsBreakdown(address user, uint256 ethAmount, bool isAgent) external view returns (
        uint256 basePoints,
        uint256 earlyBirdBonus,
        uint256 agentBonus,
        uint256 streakBonus,
        uint256 tierBonus,
        uint256 totalPoints_
    ) {
        basePoints = (ethAmount * POINTS_PER_ETH) / 1 ether;
        
        if (earlyBirdActive && userCount < earlyBirdCutoff && !isUser[user]) {
            earlyBirdBonus = (basePoints * EARLY_BIRD_BONUS) / 100;
        }
        
        if (isAgent) {
            agentBonus = (basePoints * AGENT_BONUS) / 100;
        }
        
        uint256 streakDays = _getStreakDays(user);
        if (streakDays > 0) {
            uint256 bonus = streakDays * STREAK_BONUS;
            if (bonus > 350) bonus = 350;
            streakBonus = (basePoints * bonus) / 100;
        }
        
        uint8 tier = userStats[user].tier;
        if (tier > 0) {
            tierBonus = (basePoints * tier * 25) / 100;
        }
        
        totalPoints_ = basePoints + earlyBirdBonus + agentBonus + streakBonus + tierBonus;
    }

    // ============ Admin Functions ============
    
    function addSupportedToken(
        address token,
        address priceFeed,
        uint256 minAmount,
        uint256 maxAmount,
        uint256 pointsMultiplier
    ) external onlyOwner {
        supportedTokens[token] = SupportedToken({
            enabled: true,
            priceFeed: priceFeed,
            minAmount: minAmount,
            maxAmount: maxAmount,
            pointsMultiplier: pointsMultiplier
        });
        emit TokenAdded(token, pointsMultiplier);
    }

    function removeToken(address token) external onlyOwner {
        supportedTokens[token].enabled = false;
        emit TokenRemoved(token);
    }

    function setFee(uint256 _fee) external onlyOwner {
        require(_fee <= 100, "Fee too high"); // Max 1%
        bridgeFee = _fee;
    }

    function setLiquidityPool(address _pool) external onlyOwner {
        liquidityPool = _pool;
    }

    function setEarlyBirdStatus(bool active, uint256 cutoff) external onlyOwner {
        earlyBirdActive = active;
        earlyBirdCutoff = cutoff;
    }

    // Emergency withdraw
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            (bool success, ) = owner().call{value: address(this).balance}("");
            require(success, "ETH withdrawal failed");
        } else {
            uint256 balance = IERC20(token).balanceOf(address(this));
            IERC20(token).safeTransfer(owner(), balance);
        }
    }

    receive() external payable {}
}
