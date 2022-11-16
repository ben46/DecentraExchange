// const { expect } = require('chai');
// const { ethers } = require('hardhat');

// const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
// const {   BN, expectRevert } = require('@openzeppelin/test-helpers');
// const expectEvent = require('@openzeppelin/test-helpers/src/expectEvent');

// const swapTestCases = [
//     [1, 5, 10, '1662497915624478906'],
//     [1, 10, 5, '453305446940074565'],

//     [2, 5, 10, '2851015155847869602'],
//     [2, 10, 5, '831248957812239453'],

//     [1, 10, 10, '906610893880149131'],
//     [1, 100, 100, '987158034397061298'],
//     [1, 1000, 1000, '996006981039903216']
//   ].map(a => a.map(n => (typeof n === 'string' ? BN(n, 'wei').toString() : BN(n, 'ether').toString()    )))

//   swapTestCases.forEach((swapTestCase, i) => {
//     it(`getInputPrice:${i}`, async () => {
//       const [swapAmount, token0Amount, token1Amount, expectedOutputAmount] = swapTestCase
//       console.log(swapAmount, token0Amount, token1Amount, expectedOutputAmount)
//     })
// })