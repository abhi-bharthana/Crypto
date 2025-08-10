# Mini Blockchain

This document provides instructions on how to run and test the mini blockchain application.

## Installation

First, install the required Python packages using pip:

```bash
pip install -r requirements.txt
```

## Running the Application

To run the blockchain node, execute the following command:

```bash
python api.py
```

By default, the application will run on `http://localhost:5000`. You can run multiple nodes on different ports by using the `-p` or `--port` argument:

```bash
python api.py -p 5001
python api.py -p 5002
```

## Testing the API

You can use a tool like `curl` to interact with the API endpoints.

### Get the Blockchain

To get the current state of the blockchain:

```bash
curl http://localhost:5000/chain
```

### Mine a New Block

To mine a new block:

```bash
curl http://localhost:5000/mine
```

### Create a New Transaction

To create a new transaction, send a POST request to the `/transactions/new` endpoint with the transaction details in the request body:

```bash
curl -X POST -H "Content-Type: application/json" -d '{
 "sender": "my-address",
 "recipient": "another-address",
 "amount": 5
}' http://localhost:5000/transactions/new
```

### Register New Nodes

To register new nodes in the network, send a POST request to the `/nodes/register` endpoint with a list of node addresses:

```bash
curl -X POST -H "Content-Type: application/json" -d '{
 "nodes": ["http://localhost:5001"]
}' http://localhost:5000/nodes/register
```

### Resolve Conflicts

To resolve conflicts and ensure that you have the longest chain, you can use the consensus algorithm:

```bash
curl http://localhost:5000/nodes/resolve
```
