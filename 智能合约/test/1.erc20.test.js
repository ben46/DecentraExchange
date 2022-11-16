const { expect } = require('chai');
const { ethers } = require('hardhat');

const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const {   BN, expectRevert } = require('@openzeppelin/test-helpers');
const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}
const ether = tokens

describe('ERC20', () => {
  let c_WETH9, c_Token01, c_Token02, c_UniswapV2Router02, c_UniswapV2Factory
  let deployer, spender, user2, users
  let escrowAmount = ether(0.0001)

  beforeEach(async () => {
    [deployer, spender, user2, ...users] = await ethers.getSigners();
  })

  async function myPrepare(){
    const WETH9 = await ethers.getContractFactory('ERC20Token')
    c_WETH9 = await WETH9.deploy('Token0', 'TK0', ether(10000))
    await c_WETH9.deployed()
    console.log('ERC20 address:'+ c_WETH9.address)
  }

  describe('when no money', () => {

    it('appove should revert', async () => {
        console.log('approve should revert');
        await loadFixture(myPrepare);
        const approve_amount = ether(0.00001);
        const balance = await c_WETH9.connect(deployer).balanceOf(deployer.address);
        console.log(approve_amount, balance);
        await expectRevert(
            c_WETH9.connect(deployer).approve(spender.address, approve_amount.add(balance)), 
            "ERC20:insufficient balance"
        );     
    })

    describe('transfer from owner to user2', async () => {
        let tx, balance0_before, balacne1_before, transfer_amount;
        beforeEach(async function(){
            console.log('transfer from owner to user2')
            await loadFixture(myPrepare)
            transfer_amount = ether(0.00001); 
            balance0_before = await c_WETH9.balanceOf(deployer.address);
            console.log(balance0_before)
            balacne1_before = await c_WETH9.balanceOf(user2.address);
            console.log(balacne1_before)
            tx = await c_WETH9.connect(deployer).transferFrom(deployer.address, user2.address, transfer_amount);
            console.log('转账中。。。')
        })

        it('transfer event emit', async function() {
            // 看下event是否记录了
            const receipt = await tx.wait()
            expect(receipt.events[0].args.from).to.equal(deployer.address);
            expect(receipt.events[0].args.to).to.equal(user2.address);
            expect(receipt.events[0].args.value).to.equal(transfer_amount);
            expect(receipt.events[0].event).to.equal("Transfer");
            console.log('event emitted');
        })

        it('transfer from owner to user2', async () => {
            const balance0_after = await c_WETH9.balanceOf(deployer.address);
            const balance1_after = await c_WETH9.balanceOf(user2.address);
            // 看下balance是否有变化
            expect(balance0_before).to.equal(balance0_after.add(transfer_amount))
            expect(balacne1_before).to.equal(balance1_after.sub(transfer_amount))
        })
    })

    describe('授权给第三方转账', async () => {
        let receipt, approve_amount, balanceBefore;
        beforeEach(async function(){
            await loadFixture(myPrepare)
            approve_amount = ether(0.00001);
            const tx =await c_WETH9.approve(spender.address, approve_amount)
            receipt = await tx.wait()
        })

        async function transfer(transfer_amount){
            const tx = await c_WETH9.connect(spender).transferFrom(deployer.address, user2.address, transfer_amount);
            console.log('转账中。。。')
            return tx.wait();
        }

        it('after transfer equal', async () => {
            const approved_allowance = await c_WETH9.allowance(deployer.address, spender.address);
            expect(approved_allowance).to.equal(approve_amount);
        })

        it('approval emit', async () => {
            expect(receipt.events[0].args.owner).to.equal(deployer.address);
            expect(receipt.events[0].args.spender).to.equal(spender.address);
            expect(receipt.events[0].args.value).to.equal(approve_amount);
            expect(receipt.events[0].event).to.equal("Approval");
        })

        it('转账balance', async () => {
            const balance0_before = await c_WETH9.balanceOf(deployer.address);
            console.log(balance0_before)
            const balacne1_before = await c_WETH9.balanceOf(user2.address);
            console.log(balacne1_before)
            
            const _receipt = await transfer(approve_amount);
            const balance0_after = await c_WETH9.balanceOf(deployer.address);
            const balance1_after = await c_WETH9.balanceOf(user2.address);

            // 看下balance是否有变化 
            expect(balance0_before).to.equal(balance0_after.add(approve_amount))
            expect(balacne1_before).to.equal(balance1_after.sub(approve_amount))
        })

    })
 
  })

})
