var assert = require('assert');
const RLNSmartContract = require("@setl/rln_smartcontract_sdk");
const path = require('path');

let state0={};
let state1={};
let state2={};
let state3={};
let state4={};
let state5={};

(async () => {
	await RLNSmartContract.loadContracts(path.join(__dirname,'../contracts'))
    let hasFunction = (RLNSmartContract.pureFunctions.hasOwnProperty('Payment Mandate'))
    assert.equal(hasFunction, true);

    let genesisRoles ={
        payer:{party:'bank1',confirmed:"waiting"},
        receiver:{party:'bank2',confirmed:"waiting"},
        instructor:{party:'central',confirmed:"waiting"}
    }

    let payer ="DEMOUS01XXX - bank1"
    let receiver ="DEMOUS02XXX - bank2"

    let genesisData={ 
        comment: "this is a comment",
        payerPartition: payer,
        payerAddress: "pa",
        receiverPartition: receiver,
        receiverAddress:"ra",
        currency: "USD",
        amount: 1000,
        status: "initialized"
    }

    state0 = await RLNSmartContract.init('bank1', 'Payment Mandate', genesisRoles, genesisData)

    // console.log(state0)

    state1 = await RLNSmartContract.callfunction('bank1', 'Payment Mandate', 'register', state0, {register:"agreed"})

    console.log("state1")

    state2 = await RLNSmartContract.callfunction('bank2', 'Payment Mandate', 'register', state1, {register:"agreed"})

    console.log("state2")

    state3 = await RLNSmartContract.callfunction('central', 'Payment Mandate', 'register', state2, {register:"agreed"})

    console.log("state3")

    state4 = await RLNSmartContract.callfunction('central', 'Payment Mandate', 'makePayment', state3, {paymentReference:"paymentref", execution:"manual"})

    console.log("state4")

    state5 = await RLNSmartContract.callfunction('bank2', 'Payment Mandate', 'confirmPayment', state4, {paymentReference:"paymentref"})

    console.log(state5.id)
    console.log(state5.roles)
    console.log(state5.data)

})();
