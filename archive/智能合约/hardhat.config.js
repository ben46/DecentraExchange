require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.5.16",
      },
      {
        version: "0.4.18",
        settings: {},
      },
      {
        version: "0.6.6",
        settings: {
          evmVersion:"istanbul",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
};