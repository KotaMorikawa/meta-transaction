const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MetaTokenTransfer", () => {
  it("Should let user transfer tokens througn a relayer", async () => {
    const randomTokenContract = await ethers.deployContract("RandomToken");
    await randomTokenContract.waitForDeployment();

    const tokenSenderContract = await ethers.deployContract("TokenSender");
    await tokenSenderContract.waitForDeployment();

    const [_, userAddress, relayerAddress, recipientAddress] =
      await ethers.getSigners();

    const tenThousandTokenWithDecimals = ethers.parseEther("10000");
    const userTokenContractInstance = randomTokenContract.connect(userAddress);
    const mintTxn = await userTokenContractInstance.freeMint(
      tenThousandTokenWithDecimals
    );
    await mintTxn.wait();

    const approveTxn = await userTokenContractInstance.approve(
      tokenSenderContract.target,
      BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      )
    );
    await approveTxn.wait();

    // META TRANSACTION !!

    let nonce = 1;

    const transferAmountOfTokens = ethers.parseEther("10");
    const messageHash = await tokenSenderContract.getHash(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      nonce,
      randomTokenContract.target
    );

    // Signed in Local
    const signature = await userAddress.signMessage(
      ethers.getBytes(messageHash)
    );

    const relayerSenderContractInstance =
      tokenSenderContract.connect(relayerAddress);

    // Execute a transaction by Relayer
    const metaTxn = await relayerSenderContractInstance.transfer(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      randomTokenContract.target,
      nonce,
      signature
    );
    await metaTxn.wait();

    const userBalance = await randomTokenContract.balanceOf(
      userAddress.address
    );
    const recipientBalance = await randomTokenContract.balanceOf(
      recipientAddress.address
    );

    expect(userBalance).to.be.lessThan(tenThousandTokenWithDecimals);
    expect(recipientBalance).to.equal(transferAmountOfTokens);
  });

  it("Should let user transfer tokens through a relayer with different nonces", async () => {
    const randomTokenContract = await ethers.deployContract("RandomToken");
    await randomTokenContract.waitForDeployment();

    const tokenSenderContract = await ethers.deployContract("TokenSender");
    await tokenSenderContract.waitForDeployment();

    const [_, userAddress, relayerAddress, recipientAddress] =
      await ethers.getSigners();

    const tenThousandTokenWithDecimals = ethers.parseEther("10000");
    const userTokenContractInstance = randomTokenContract.connect(userAddress);
    const mintTxn = await userTokenContractInstance.freeMint(
      tenThousandTokenWithDecimals
    );
    await mintTxn.wait();

    const approveTxn = await userTokenContractInstance.approve(
      tokenSenderContract.target,
      BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      )
    );
    await approveTxn.wait();

    // META TRANSACTION !!

    let nonce = 1;

    const transferAmountOfTokens = ethers.parseEther("10");
    const messageHash = await tokenSenderContract.getHash(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      nonce,
      randomTokenContract.target
    );

    // Signed in Local
    const signature = await userAddress.signMessage(
      ethers.getBytes(messageHash)
    );

    const relayerSenderContractInstance =
      tokenSenderContract.connect(relayerAddress);

    // Execute a transaction by Relayer
    const metaTxn = await relayerSenderContractInstance.transfer(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      randomTokenContract.target,
      nonce,
      signature
    );
    await metaTxn.wait();

    let userBalance = await randomTokenContract.balanceOf(userAddress.address);
    let recipientBalance = await randomTokenContract.balanceOf(
      recipientAddress.address
    );

    expect(userBalance).to.equal(ethers.parseEther("9990"));
    expect(recipientBalance).to.equal(ethers.parseEther("10"));

    nonce++;

    const messageHash2 = await tokenSenderContract.getHash(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      nonce,
      randomTokenContract.target
    );

    const signature2 = await userAddress.signMessage(
      ethers.getBytes(messageHash2)
    );

    const metaTxn2 = await relayerSenderContractInstance.transfer(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      randomTokenContract.target,
      nonce,
      signature2
    );
    await metaTxn2.wait();

    userBalance = await randomTokenContract.balanceOf(userAddress.address);
    recipientBalance = await randomTokenContract.balanceOf(
      recipientAddress.address
    );

    expect(userBalance).to.equal(ethers.parseEther("9980"));
    expect(recipientBalance).to.equal(ethers.parseEther("20"));
  });

  it("Should not let signature replay happen", async () => {
    const randomTokenContract = await ethers.deployContract("RandomToken");
    await randomTokenContract.waitForDeployment();

    const tokenSenderContract = await ethers.deployContract("TokenSender");
    await tokenSenderContract.waitForDeployment();

    const [_, userAddress, relayerAddress, recipientAddress] =
      await ethers.getSigners();

    const tenThousandTokensWithDecimals = ethers.parseEther("10000");
    const userTokenContractInstance = randomTokenContract.connect(userAddress);
    const mintTxn = await userTokenContractInstance.freeMint(
      tenThousandTokensWithDecimals
    );
    await mintTxn.wait();

    // Have user infinite approve the token sender contract for transferring 'RandomToken'
    const approveTxn = await userTokenContractInstance.approve(
      tokenSenderContract.target,
      BigInt(
        "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
      )
    );
    await approveTxn.wait();

    let nonce = 1;

    const transferAmountOfTokens = ethers.parseEther("10");
    const messageHash = await tokenSenderContract.getHash(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      nonce,
      randomTokenContract.target
    );
    const signature = await userAddress.signMessage(
      ethers.getBytes(messageHash)
    );

    const relayerSenderContractInstance =
      tokenSenderContract.connect(relayerAddress);

    const metaTxn = await relayerSenderContractInstance.transfer(
      userAddress.address,
      transferAmountOfTokens,
      recipientAddress.address,
      randomTokenContract.target,
      nonce,
      signature
    );
    await metaTxn.wait();

    expect(
      relayerSenderContractInstance.transfer(
        userAddress.address,
        transferAmountOfTokens,
        recipientAddress.address,
        randomTokenContract.target,
        nonce,
        signature
      )
    ).to.be.revertedWith("Already executed!");
  });
});
