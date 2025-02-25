# Acurast LLM Example

> Find more examples in the [Acurast Examples Repository](https://github.com/acurast/acurast-example-apps)

## Overview

This is a simple example of how to deploy an LLM on Acurast and interact with it.

## Setup

1. Clone the repository

```bash
git clone https://github.com/acurast/acurast-llm-example.git
```

2. Install and build the frontend

```bash
cd chat-frontend
npm install
npm run build-single
```

3. Install and build the acurast script

```bash
cd acurast-script
npm install
npm run build
```

> Note: Make sure you have a `.env` file in the `acurast-script` directory.

4. Deploy the acurast script

```bash
cd acurast-script
npm run deploy
```

5. Wait for the deployment to start, then open the URL in your browser.

```bash
open http://<processor-address-lowercase>.acu.run/
```

> Note: The processor address is the address of the processor that was deployed.
