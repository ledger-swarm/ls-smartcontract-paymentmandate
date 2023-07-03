var assert = require('assert');
const RLNSmartContract = require("@setl/rln_smartcontract_sdk");
const path = require('path');

let state0={}
let state1={}
let state2={}
let state3={}
let state4={}

describe('Init', function () {
    
    describe('Contract Loads', function () {
        it('should load contracts from the contracts directory', async function () {

            await RLNSmartContract.loadContracts(path.join(__dirname,'../contracts'))
            let hasFunction = (RLNSmartContract.pureFunctions.hasOwnProperty('Payment Mandate'))
            assert.equal(hasFunction, true);

        });
    });

    describe('Contract Initializes', function () {
        it('should initialise a new contract', async function () {

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

            let hasFailed = (state0.hasOwnProperty('failed'))
    
            assert.equal(hasFailed, false);

        });
    });

});

describe('Participants Register', function () {

    describe('Participants Register with Contract', function () {
        it('should show that all participant can agree to a contract', async function () {

            let stateA = await RLNSmartContract.callfunction('bank1', 'Payment Mandate', 'register', state0, {register:"agreed"})
            let stateB = await RLNSmartContract.callfunction('bank2', 'Payment Mandate', 'register', stateA, {register:"agreed"})
            state1 = await RLNSmartContract.callfunction('central', 'Payment Mandate', 'register', stateB, {register:"agreed"})

            let hasRegistered = true
            
            if (!state1.hasOwnProperty('roles')){hasRegistered=false}

            if (hasRegistered){
                if (state1.roles.payer.confirmed != "agreed"){hasRegistered=false}
                if (state1.roles.receiver.confirmed != "agreed"){hasRegistered=false}
                if (state1.roles.instructor.confirmed != "agreed"){hasRegistered=false}
            }

            assert.equal(hasRegistered, true);
        });
    });
});

describe('Exercise Smartcontract Functions', function () {

    describe('Instructor makes a payment', function () {
        it('should show that the instructor can make a payment', async function () {

            state2 = await RLNSmartContract.callfunction('central', 'Payment Mandate', 'makePayment', state1, {paymentReference:"paymentref", execution:"manual"})

            let hasPaymentEvent = true
            
            if (!state2.hasOwnProperty('data')){hasPaymentEvent=false}

            if (hasPaymentEvent){
                if (!state2.data.hasOwnProperty('events')){hasPaymentEvent=false}
            }

            assert.equal(hasPaymentEvent, true);
        });
    });

    describe('Payer marks payment as actioned', function () {
        it('should show that the payer can mark a payment as actioned', async function () {

            state3 = await RLNSmartContract.callfunction('bank1', 'Payment Mandate', 'confirmActioned', state2, {paymentReference:"paymentref"})
           
            let hasPaymentEvent = true
            
            if (!state3.hasOwnProperty('data')){hasPaymentEvent=false}

            if (hasPaymentEvent){
                if (!state3.data.hasOwnProperty('events')){hasPaymentEvent=false}
                if (!state3.data.events.hasOwnProperty('actions')){hasPaymentEvent=false}
                if (!state3.data.events.actions[0].hasOwnProperty('status')){
                    hasPaymentEvent=false
                }
                if (state3.data.events.actions[0].status!=='actioned'){hasPaymentEvent=false}
            }

            assert.equal(hasPaymentEvent, true);
        });
    });

    describe('Receiver confirms a payment', function () {
        it('should show that the receiver can confirm a payment', async function () {

            state4 = await RLNSmartContract.callfunction('bank2', 'Payment Mandate', 'confirmPayment', state3, {paymentReference:"paymentref"})

            let hasConfirmed = true
            
            if (!state4.hasOwnProperty('data')){hasConfirmed=false}

            if (hasConfirmed){
                if (state4.data.status!=='complete'){hasConfirmed=false}
            }

            assert.equal(hasConfirmed, true);
        });
    });

});

