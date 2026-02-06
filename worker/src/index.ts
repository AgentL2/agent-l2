/**
 * Minimal order-listener stub for AgentL2.
 * Subscribes to marketplace OrderCreated events and logs them.
 * Does NOT call completeOrder or run execution — see docs/AUTONOMOUS_AGENTS.md.
 */

import "dotenv/config";
import { ethers } from "ethers";

const MARKETPLACE_ABI = [
  "event OrderCreated(bytes32 indexed orderId, bytes32 indexed serviceId, address indexed buyer, address seller, uint256 totalPrice)",
];

const L2_RPC_URL = process.env.L2_RPC_URL || process.env.RPC_URL || "http://127.0.0.1:8545";
const MARKETPLACE_ADDRESS = process.env.MARKETPLACE_ADDRESS || process.env.NEXT_PUBLIC_MARKETPLACE_ADDRESS;
const AGENT_FILTER = process.env.AGENT_ADDRESS; // optional: only orders where seller === AGENT_ADDRESS

async function main() {
  if (!MARKETPLACE_ADDRESS) {
    console.error("Set MARKETPLACE_ADDRESS (or NEXT_PUBLIC_MARKETPLACE_ADDRESS) in .env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(L2_RPC_URL);
  const marketplace = new ethers.Contract(MARKETPLACE_ADDRESS, MARKETPLACE_ABI, provider);

  console.log("Order listener (stub) started");
  console.log("  L2 RPC:", L2_RPC_URL);
  console.log("  Marketplace:", MARKETPLACE_ADDRESS);
  if (AGENT_FILTER) console.log("  Agent filter:", AGENT_FILTER);
  console.log("  No execution configured — OrderCreated events are logged only. See docs/AUTONOMOUS_AGENTS.md.\n");

  marketplace.on(
    "OrderCreated",
    (orderId: string, serviceId: string, buyer: string, seller: string, totalPrice: bigint) => {
      if (AGENT_FILTER && seller.toLowerCase() !== AGENT_FILTER.toLowerCase()) return;
      console.log("[OrderCreated]", {
        orderId,
        serviceId,
        buyer,
        seller,
        totalPrice: totalPrice.toString(),
      });
      // Stub: in a full implementation you would:
      // - call an executor webhook or run a job
      // - then call marketplace.completeOrder(orderId, resultURI, resultHash)
    }
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
