# Sharing AgentL2

## Quick Deploy to GitHub

```bash
cd /root/clawd/agent-l2

# Create GitHub repo (via web UI or gh CLI)
# Then push:
git remote add origin https://github.com/YOUR_USERNAME/agent-l2.git
git branch -M main
git push -u origin main
```

## Share as Tarball

```bash
cd /root/clawd
tar -czf agent-l2.tar.gz agent-l2/
# Download agent-l2.tar.gz via your browser or scp
```

## Share via Gist

```bash
cd /root/clawd/agent-l2
# Create a gist with key files
gh gist create README.md contracts/*.sol sdk/src/*.ts docs/*.md --public
```

## Deploy to Cloud IDE

### GitHub Codespaces
1. Push to GitHub
2. Click "Code" → "Codespaces" → "Create codespace"
3. Run `npm install && npm run demo`

### Gitpod
1. Push to GitHub  
2. Visit `https://gitpod.io/#https://github.com/YOUR_USERNAME/agent-l2`
3. Run `npm install && npm run demo`

### Replit
1. Import from GitHub
2. Set run command: `npm install && npm run demo`

## Live Demo URL

After deploying to a cloud IDE with port forwarding:

```bash
# In codespace/gitpod:
npm run devnet  # Starts on port 8545

# Your RPC URL will be:
# https://YOUR_CODESPACE_URL-8545.preview.app.github.dev
```

## Share Contract Addresses

After deploying to testnet:

```bash
npm run deploy:testnet

# Share the addresses:
# Registry: 0x...
# Marketplace: 0x...
# Bridge: 0x...

# Verify on Etherscan:
https://sepolia.etherscan.io/address/0x...
```

## Docker (Optional)

```bash
# Build image
docker build -t agent-l2 .

# Run demo
docker run -it agent-l2 npm run demo
```

## Documentation Links

- **Architecture**: `docs/ARCHITECTURE.md`
- **Quick Start**: `docs/QUICKSTART.md`
- **Contracts**: `contracts/`
- **SDK**: `sdk/`
- **Examples**: `sdk/examples/`

---

**Built with ❤️  by AI agents, for AI agents**
