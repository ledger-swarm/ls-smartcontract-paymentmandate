/*--------------------------------------------------------------------------------

Payment Mandate Contract

--------------------------------------------------------------------------------*/

const contractName = "Payment Mandate";

const description =
  "The Payment Mandate contract is an agreement for an instructor to trigger a single payment between a payer and a receiver";

/*--------------------------------------------------------------------------------

Schema components used to buld the genesis schemas and function schemas

--------------------------------------------------------------------------------*/

const partitions = [
  "DEMOUS01XXX",
  "DEMOUS01BR1",
  "DEMOUS02XXX",
  "DEMOUS02BR1",
  "CENTRLBK"
];
  
const partitionSchema = {
  type: "string",
  enum: partitions,
};
  
const partyMembers = [
  "bank1",
  "bank1branch",
  "bank2",
  "bank2branch",
  "central"
];

const partySchema = {
  type: "string",
  enum: partyMembers,
};

const roleSchema = {
  type: "object",
  properties: {
    party: partySchema,
    confirmed: { type: "string", enum: ["waiting"] },
  },
  required: ["party", "confirmed"],
  additionalProperties: false,
};

/*--------------------------------------------------------------------------------

Genesis Roles Schema and Genesis Data Schema required to initialize a contract

--------------------------------------------------------------------------------*/

const genesisRolesSchema = {
  type: "object",
  properties: {
    payer: roleSchema,
    receiver: roleSchema,
    instructor: roleSchema,
  },
  required: ["payer", "receiver", "instructor"],
  additionalProperties: false,
};

const genesisDataSchema = {
  type: "object",
  properties: {
    comment: { type: "string" },
    payerDomain: { type: "string" , enum: ["DOMAIN"] },
    payerPartition: partitionSchema,
    payerAddress: { type: "string" },
    receiverDomain: { type: "string" , enum: ["DOMAIN"] },
    receiverPartition: partitionSchema,
    receiverAddress: { type: "string" },
    assetId: { type: "string" },
    amount: { type: "number" },
    status: { type: "string", enum: ["initialized"] },
  },
  required: [
    "comment",
    "payerDomain",
    "payerPartition",
    "payerAddress",
    "receiverDomain",
    "receiverPartition",
    "receiverAddress",
    "assetId",
    "amount",
    "status"
  ],
  additionalProperties: false,
};

/*--------------------------------------------------------------------------------

Schema for Inputs to Functions to transition contract state.  
One schema for each function

--------------------------------------------------------------------------------*/

const registerSchema = {
  type: "object",
  properties: {
    register: { type: "string", enum: ["agreed", "rejected"] },
  },
  required: ["register"],
  additionalProperties: false,
};

const makePaymentSchema = {
  type: "object",
  properties: {
    paymentReference: { type: "string" },
    execution: { type: "string", enum: ["manual","automatic"] },
  },
  required: ["paymentReference","execution"],
  additionalProperties: false,
};

const confirmActionedSchema = {
  type: "object",
  properties: {
    paymentReference: { type: "string" },
  },
  required: ["paymentReference"],
  additionalProperties: false,
};

const confirmPaymentSchema = {
  type: "object",
  properties: {
    paymentReference: { type: "string" },
  },
  required: ["paymentReference"],
  additionalProperties: false,
};

/*--------------------------------------------------------------------------------

Smart Contract Flow Constraints 

--------------------------------------------------------------------------------*/      

const flowConstraints = {
  initialized: {
    payer: {actions:["register"], outcomes:["agreed","rejected","initialized"]},
    receiver: {actions:["register"], outcomes:["agreed","rejected","initialized"]},
    instructor: {actions:["register"], outcomes:["agreed","rejected","initialized"]},
  },
  agreed: {
    payer: {actions:[],outcomes:[]},
    receiver: {actions:[],outcomes:[]},
    instructor: {actions:["makePayment"], outcomes:["instructed"]},
  },
  instructed: {
    payer: {actions:["confirmActioned"], outcomes:["instructed"]},
    receiver: {actions:["confirmPayment"], outcomes:["complete"]},
    instructor: {actions:[],outcomes:[]},
  },
  complete: {
    payer: {actions:[],outcomes:[]},
    receiver: {actions:[],outcomes:[]},
    instructor: {actions:[],outcomes:[]},
  },
  rejected: {
    payer: {actions:[],outcomes:[]},
    receiver: {actions:[],outcomes:[]},
    instructor: {actions:[],outcomes:[]}
  }
}

/*--------------------------------------------------------------------------------

Smart Contract Init Function 

--------------------------------------------------------------------------------*/

/* Here is the explanation for the code above:
1. The init function is the only function that can be called before a contract is instantiated.
2. The init function is called when a contract is instantiated.
3. The init function can only be called by a party that is in the partyMembers list.
4. The init function takes in five arguments.
5. The first argument is the caller of the function (i.e., the party that is calling the function).
6. The second argument is the contractId.
7. The third argument is an object that contains all the roles in the contract.
8. The fourth argument is an object that contains all the data in the contract.
9. The fifth argument is an object that contains all the functions in the contract.
10. The init function returns a contractState object that contains the contractId, the roles in the contract, the data in the contract, the functions in the contract, and the hash of the prior contractState.
11. If the init function does not return a contractState object, then it returns a failed object.
12. The failed object contains an error message that explains why the function failed. */

function init(
  caller,
  genesisContractId,
  genesisRoles,
  genesisData,
  genesisFunctions
) {
  try {
    // set the parties who can instantiate this contract
    let admins = partyMembers;

    if (!admins.includes(caller)) {
      throw "You are not authorized to initialize this contract";
    }
    let contractState = {};
    contractState.id = genesisContractId;
    contractState.roles = {};
    contractState.roles = genesisRoles;
    contractState.data = genesisData;
    contractState.functions = genesisFunctions;
    contractState.priorHash = "";
    return contractState;
  } catch (err) {
    return { failed: err };
  }
}

/*--------------------------------------------------------------------------------

Smart Contract Transition Functions

--------------------------------------------------------------------------------*/

function register(caller, partyRoles, contractState, inputs) {
  try {
    
    // register the caller on each of their roles
    for (var i=0; i<partyRoles.length; i++) {
      let partyRole = partyRoles[i];
      contractState.roles[partyRole].confirmed = inputs.register;
      if (inputs.register == "rejected") {
        contractState.data.status = "rejected";
      }
    }
    
    // if rejected, update state and return
    if (contractState.data.status == "rejected") {
      contractState.priorHash = contractState.stateHash;
      return contractState;
    }

    // check if all parties have agreed
    let agreed = true;
    for (var key in contractState.roles) {
      if (contractState.roles[key].confirmed == "waiting") {
        agreed = false;
      }
    }

    // update contract state to agreed
    if (agreed) {
      contractState.data.status = "agreed";
    }
    contractState.priorHash = contractState.stateHash;
    return contractState;
  } catch (err) {
    return { failed: err };
  }
}

/*--------------------------------------------------------------------------------*/

function makePayment(caller, partyRoles, contractState, inputs) {
  try {
    
    // if allowed by flow constraints, update state

    let payer = "";
    let receiver = "";
    for (var key in contractState.roles) {
      if (key == "payer") {
        payer = contractState.roles[key].party;
      }
      if (key == "receiver") {
        receiver = contractState.roles[key].party;
      }
    }

    // check the reference is unique

    isUnique = true;
    if (contractState.data.events) {
      for (var i=0; i<contractState.data.events.actions.length; i++) {
        if (contractState.data.events.actions[i].paymentReference == inputs.paymentReference) {
          isUnique = false;
        }
      }
    }

    if (!isUnique) {
      throw "Payment reference is not unique";
    }
    
    // create the payment event
    contractState.data.events = {};
    contractState.data.events.actions = [];
    let action = {};

    // set the action
    action.type="RLNCREATE"
    action.atomicGroup = [];

    transaction={}
    transaction.action = "create";

    transaction.fromAccount = contractState.data.payerAddress;
    transaction.fromDomain = contractState.data.payerDomain;
    transaction.fromParticipant = contractState.data.payerPartition;

    transaction.toAccount = contractState.data.receiverAddress;
    transaction.toDomain = contractState.data.receiverDomain;
    transaction.toParticipant = contractState.data.receiverPartition;

    transaction.amount = contractState.data.amount;
    transaction.assetId = contractState.data.assetId;
    action.atomicGroup.push(transaction);

    action.consensus = [];
    let consensusObj = {};
    // set the parties who must confirm action has happened
    consensusObj.participant = receiver;
    consensusObj.status = "unconfirmed";
    action.consensus.push(consensusObj);

    // set the party who must submit the actions
    action.submitter = payer;
    action.status = "proposed";
    action.reference = inputs.paymentReference;
    action.execution = inputs.execution;
    // add the action to the event list
    contractState.data.events.actions.push(action);

    // set the contract status
    contractState.data.status = "instructed";
    contractState.priorHash = contractState.stateHash;
    return contractState;
  } catch (err) {
    console.log(err);
    return { failed: err };
  }
}

/*--------------------------------------------------------------------------------*/

function confirmActioned(caller, partyRoles, contractState, inputs) {
  try {
    // find the action with input.paymentReference and mark the status as actioned
    let foundReference = false;
    for (var i = 0; i < contractState.data.events.actions.length; i++) {
      if (contractState.data.events.actions[i].reference == inputs.paymentReference 
          && contractState.data.events.actions[i].submitter == caller
          && contractState.data.events.actions[i].status == "proposed") {
        foundReference = true;
        contractState.data.events.actions[i].status = "actioned";
      }
    }

    if (!foundReference) {
      throw "Payment reference not found or already actioned";
    }

    contractState.priorHash = contractState.stateHash;
    return contractState;
  } catch (err) {
    return { failed: err };
  }
}

/*--------------------------------------------------------------------------------*/

function confirmPayment(caller, partyRoles, contractState, inputs) {
  try {
    
    // if allowed by flow constraints, update state

    let complete = true;
    let referencefound = false;
    for (var i = 0; i < contractState.data.events.actions.length; i++) {
      let consensus = true;
      if (contractState.data.events.actions[i].reference == inputs.paymentReference) {
        referencefound = true;
      }
      for (var j=0; j < contractState.data.events.actions[i].consensus.length; j++) {
        if (contractState.data.events.actions[i].consensus[j].participant == caller) {
          contractState.data.events.actions[i].consensus[j].status = "confirmed";
        } else {
          if (contractState.data.events.actions[i].consensus[j].status == "unconfirmed") {
            consensus = false;
          }
        }
      }
      if (consensus){
        contractState.data.events.actions[i].status = "confirmed";
      } else {
        complete = false;
      }
    }

    if (!referencefound) {
      throw "Payment reference does not match";
    }
    if (complete) {
      contractState.data.status = "complete";
    }

    contractState.priorHash = contractState.stateHash;
    return contractState;
  } catch (err) {
    return { failed: err };
  }
}

/*------------------------------------------------------------------------------

Export the contract details, functions and schemas

------------------------------------------------------------------------------*/

module.exports = {
  contractName: contractName,
  description: description,
  schemas: {
    genesisData: genesisDataSchema,
    genesisRoles: genesisRolesSchema,
    register: registerSchema,
    makePayment: makePaymentSchema,
    confirmActioned: confirmActionedSchema,
    confirmPayment: confirmPaymentSchema,
  },
  flowConstraints: flowConstraints,
  functions: {
    init,
    register,
    makePayment,
    confirmActioned,
    confirmPayment,
  },
};
