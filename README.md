# Example tbdex implementation

This is a starter kit for building a Participating Financial Institution (PFI) gateway to provide liquidity services on the tbdex network. You can fork this and use it (or use it as inspiration!). Contains mock implementations of some features of a PFI, as well as a VC issuer.

Mock Typescript PFI implementation for example purposes using:
* [@tbdex/http-server](https://www.npmjs.com/package/@tbdex/http-server)
* Postgres as underlying DB

# Running in codesandbox

You can run this example in codesandbox, or locally. 

To run in codesandbox, use this link and then continue on from the preparing server section below. 

<a href="https://githubbox.com/michaelneale/tbdex-pfi-exemplar">Open sandbox</a>

# Local Development Prerequisites


## `node` and `npm`
This project is using `node v20.3.1` and `npm >=v7.0.0`. You can verify your `node` and `npm` installation via the terminal:

```
$ node --version
v20.3.1
$ npm --version
9.6.7
```

If you don't have `node` installed, feel free to choose whichever installation approach you feel the most comfortable with. If you don't have a preferred installation method, we recommend using `nvm` (aka node version manager). `nvm` allows you to install and use different versions of node. It can be installed by running `brew install nvm` (assuming that you have homebrew)

Once you have installed `nvm`, install the desired node version with `nvm install vX.Y.Z`.

## Docker
Docker is used to spin up a local mysql container. Docker for Mac can be installed from [here](https://docs.docker.com/desktop/install/mac-install/)

## `dbmate`
dbmate is used to run database migrations. Run `brew install dbmate` from your command line

# Preparing the server database (one time)

> 💡 Make sure you have all the [prerequisites](#development-prerequisites)

0. clone the repo and `cd` into the project directory
1. Start psql container by running `./db/scripts/start-pg` from your command line
2. Run the database migrations `./db/scripts/migrate` (Only needs to be done once and then whenever changes are made in `db/migrations`)
3. Install all project dependencies by running `npm install`
4. run `cp .env.example .env`. This is where you can set any necessary environment variables. `.env.example` contains all environment variables that you _can_ set.

`npm run server` to check it runs. 

# Running end to end PFI tutorial

In this tutorial we will set up an issuer to issue Sanction check VCs, as well as create a customer called "alice" to interact with the PFI server.

## Step 1 
Ensure you have prequesites installed and the server database is running (see above)

## Step 2: Create a VC issuer
Run `npm run example-create-issuer` to create a new VC issuer, which will be needed by the PFI. 
(`issuer.json` stores the private info for the issuer).

## Step 3: Configure the PFI database with offerings and VC issuer
Add the issuer info to `seed-offerings.ts` in the commented out section (and remove the comments).

Then run `npm run seed-offerings` as described to prepare the PFI with the issuer DID and the offerings it will provide.

## Step 4: Create the identity for customer "Alice"

Run `npm run example-create-customer` to create a new "customer" DID (customer is called Alice, think of it as her wallet). Take note of her did which will be used in the next step. 

Alice's private wallet info is stored in `alice.json`.

## Step 5: Issue a sanctions check VC to "Alice"
Issue the credential to alice, which ensures Alice is a non-sanctioned individual.

Run `npm run example-issue-credential $customer_did` with the DID from the previous step. 
Take note of the signed VC that is returned. 

## Step 6: Run the PFI server

Run the server (or restart it) in another terminal window: 

`npm run server`

Note it prints out the DID for the server after it starts, take a copy of this for the next step

## Step 7: Run a tbdex exchange

Run a tbdex transaction (or exchange):

Take the customer DID string and the signed VC string (both long) and run: 

`npm run example-rfq $pfi_server_did $signed_vc`

With the values from step 6 and step 5. 
You will see the server print out the interaction between the customer and the PFI, this will look up offers, ask for a quote, place an order and  finally check for status.

Each interaction happens in the context of an "Exchange" which is a record of the interaction between the customer and the PFI.


# Implementing a PFI

## The PFI server

Run `npm run server` to start the server. The server business logic (such as it is!) is in `src/main.ts` which you can see, doesn't do a lot, but it is something you can start with. Also look in `src/db/exchange-repository.ts` which out of the box has some simple built in functionality.


For server implementers `_ExchangeRepository` is an intersting class to lookup: `getExchange` or `getExchanges` is how order statuses and quotes can be exposed to the client.

Some interesting example parts of the code are `getOfferings` which returns what offers the PFI currently has, and `rfq` which creates a message to send to the PFI to request a quote for a particular offering (with the issuer saying that the customer 'Alice' is not a sanctioned individual). `getExchanges` shows the current state of the interaction between Alice and the PFI.

`seed-offerings.ts` also sets up the PFI with the offerings and requirements for the client to be able to make a request for a quote.

You also should use a non ephemeral DID (using the env vars config as described above).

TODO: more content needed here...



# DB stuff
## Convenience Scripts

| Script                       | Description                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------- |
| `./db/scripts/start-pg`   | Starts dockerized psql if it isn't already running.                                      |
| `./db/scripts/stop-pg`    | Stops dockerized psql if it is running. Passing `-rm` will delete the container as well. |
| `./db/scripts/use-pg`     | Drops you into a psql shell.                                                             |
| `./db/scripts/new-migration` | Creates a new migration file.                                                             |
| `./db/scripts/migrate`       | Runs DB migrations.                                                                       |

## Migration files
Migration files live in the `db/migrations` directory. This is where all of our database schemas live.

### Adding a migration file
to create a new migration file, run the following command from the command line

```bash
./db/scripts/new-migration replace_with_file_name
```

This will generate a barebones migration template file for you

>💡 The above example assumes you're in the root directory of the project. adjust the path to the script if you're not in the root.

>💡 for `replace_with_file_name`, the general convention i think is `<action>_<tblname>_table`. e.g. if you're wanting to create a migration file to create a `quotes` table, you could use `create_quotes_table` as the filename.
### Running migrations
Migrations can be applied by running `./db/scripts/migrate` from the command line

## Running Manual Queries & Debugging

From the command line, run: 
```bash
./db/scripts/use-pg
```

This will drop you into an interactive db session

# Configuration
Configuration can be set using environment variables. Defaults are set in `src/config.ts`

# Project Resources

| Resource                                   | Description                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| [CODEOWNERS](./CODEOWNERS)                 | Outlines the project lead(s)                                                   |
| [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) | Expected behavior for project contributors, promoting a welcoming environment |
| [CONTRIBUTING.md](./CONTRIBUTING.md)       | Developer guide to build, test, run, access CI, chat, discuss, file issues     |
| [GOVERNANCE.md](./GOVERNANCE.md)           | Project governance                                                             |
| [LICENSE](./LICENSE)                       | Apache License, Version 2.0                                                    |
