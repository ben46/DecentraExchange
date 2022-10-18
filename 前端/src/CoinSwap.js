const [provider, setProvider] = React.useState(getProvider());
const [signer, setSigner] = React.useState(getSigner(provider));
const [account, setAccount] = React.useState(undefined); // This is populated in a react hook
const [router, setRouter] = React.useState(
getRouter("0x4489D87C8440B19f11d63FA2246f943F492F3F5F", signer)
);
const [weth, setWeth] = React.useState(
getWeth("0x3f0D1FAA13cbE43D662a37690f0e8027f9D89eBF", signer)
);
const [factory, setFactory] = React.useState(
getFactory("0x4EDFE8706Cefab9DCd52630adFFd00E9b93FF116", signer)
);