# Functions:

- [`create(address[4] _addr, address _registry, uint256[3] _intdata, address owner)`](#IStakeContractFactory-create-address-4--address-uint256-3--address-)

###### IStakeContractFactory-create-address-4--address-uint256-3--address-

## Function `create(address[4] _addr, address _registry, uint256[3] _intdata, address owner)`

Create a stake contract that can stake TON.

### Parameters:

- `_addr`: the array of [token, paytoken, vault, defiAddr]

- `_registry`:  the registry address

- `_intdata`: the array of [saleStartBlock, startBlock, periodBlocks]

- `owner`:  owner address

### Return Values:

- contract address
