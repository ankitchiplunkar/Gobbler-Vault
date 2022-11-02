// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import { IArtGobbler } from "./IArtGobbler.sol";
import { IMintStrategy } from "./IMintStrategy.sol";
import { ERC20 } from "solmate/src/tokens/ERC20.sol";
import { IERC20 } from "@openzeppelin/contracts/interfaces/IERC20.sol";
import { ReentrancyGuard } from "solmate/src/utils/ReentrancyGuard.sol";
import { Owned } from "solmate/src/auth/Owned.sol";
import { LibGOO } from "./LibGOO.sol";
import { toDaysWadUnsafe } from "solmate/src/utils/SignedWadMath.sol";

/// @title Vault to multiply your Gobblers
/// @author Ankit Chiplunkar
/// @notice Use this contract to stake Gobblers and mint based on strategies
/// @dev Contract accepts Gobblers and uses the generated Goo to buy more Gobblers
contract MultiplyGobblerVault is ERC20, Owned, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                ADDRESS VARIABLES
    //////////////////////////////////////////////////////////////*/
    /// @notice The address of the ArtGobblers ERC721 token contract.
    IArtGobbler public immutable artGobbler;
    /// @notice The address of the Goo ERC20 token contract.
    IERC20 public immutable goo;
    /// @notice The address of the Strategy contract.
    IMintStrategy public mintStrategy;
    /// @notice The address which receives the tax
    address public taxAddress;

    /*//////////////////////////////////////////////////////////////
                Variables updated each mint
    //////////////////////////////////////////////////////////////*/
    /// @notice The emission multiple after the last mint
    uint256 public lastMintEmissionMultiple;
    /// @notice The Goo Balance after the last mint
    uint256 public lastMintGooBalance;
    /// @notice The timestamp after the last mint
    uint256 public lastMintTimestamp;
    /// @notice Total Gobblers minted by the vault
    uint256 public totalMinted = 0;

    /*//////////////////////////////////////////////////////////////
                Contract Constants
    //////////////////////////////////////////////////////////////*/
    /// @notice Precision to calculate the Deposit tax based on multipliers
    uint256 public constant PRECISION = 1e6;
    /// @notice Tax rate to calculate the Deposit tax based on multipliers, set to 0.5% in this contract
    uint256 public constant TAX_RATE = 5000;
    /// @notice Deposit tax starts after these many mints
    uint256 public constant DEPOSIT_TAX_START_AFTER = 2;
    /// @notice Goo Deposit deduction starts after these many mints
    uint256 public constant GOO_DEPOSIT_START_AFTER = 2;

    /*//////////////////////////////////////////////////////////////
                Lagged deposit variables
    //////////////////////////////////////////////////////////////*/
    /// @notice Total multiple of the gobblers which are deposited in a lagged fashion
    uint256 public totalLaggedMultiple = 0;
    /// @notice Mapping to keep track of which addresses have deposited how many multipliers in which totalMint
    mapping(address => mapping(uint256 => uint256)) public laggingDeposit;
    /// @notice Mapping to keep track of which mintNumber mints which gobblerId
    mapping(uint256 => uint256) public mintedGobbledId;

    /*//////////////////////////////////////////////////////////////
                ERRORS
    //////////////////////////////////////////////////////////////*/
    error GooDepositFailed();
    error TotalMintedIsZero();
    error ClaimingInLowerMintWindow();
    error UnrevealedGobbler();
    error MintedGobblerUnrevealed();

    /*//////////////////////////////////////////////////////////////
                EVENTS
    //////////////////////////////////////////////////////////////*/
    event GobblerMinted(uint256 gobblerId);
    event LegendaryGobblerMinted(uint256 numGobblersBurnt);
    event MintStrategyChanged(address oldMintStrategy, address newMintStrategy);
    event TaxAddressChanged(address oldTaxAddress, address newTaxAddress);

    /*//////////////////////////////////////////////////////////////
                CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/
    /// @notice Constructor sets up contracts of the ecosystem and deploys erc20
    /// @dev Initializes the erc20 and owned constructor variables
    /// @param _artGobbler Address of the Art Gobbler ERC721 contract
    /// @param _goo Address of the Goo ERC20 contract
    constructor(
        address _artGobbler,
        address _goo,
        address _mintStrategy
    ) ERC20("Multiply Gobbler", "mGOB", 18) Owned(msg.sender) {
        artGobbler = IArtGobbler(_artGobbler);
        goo = IERC20(_goo);
        mintStrategy = IMintStrategy(_mintStrategy);
    }

    /*//////////////////////////////////////////////////////////////
                VIEW FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Returns the conversion rate between Gobbler multiplier and tokens
    /// @dev Conversion rate changes ONLY with minted Gobbler reveals
    /// @dev Lagged deposit do not change the conversion rate
    /// @dev Conversion rate starts at 10**18 and increases as more Gobblers are minted and revealed
    /// @return Conversion rate between multiplier and tokens to be minted
    function getConversionRate() public view returns (uint256) {
        if (totalSupply > 0) {
            uint256 vaultMultiple = artGobbler.getUserEmissionMultiple(address(this));
            return totalSupply / (vaultMultiple - totalLaggedMultiple);
        }
        return 10**18;
    }

    /// @notice Returns the Goo to be deposited with a Gobbler
    /// @dev Users who deposit a Gobbler between mints should also deposit Goo for the time they were outside the vault
    /// @dev GooDeposit is the Goo the Gobbler could have produced if it was inside the vault since the last mint
    /// @param multiplier multiplier of the Gobbler to be deposited
    /// @return Goo amount to be deposited with the Gobbler
    function getGooDeposit(uint256 multiplier) public view returns (uint256) {
        // Do not take any goo deposit till the GOO_DEPOSIT_START_AFTER mint
        // this will expose the vault for MEV etc in the first few mints
        // intention is to test the vault till the first mints anyways
        if (totalMinted <= GOO_DEPOSIT_START_AFTER) return 0;
        return
            LibGOO.computeGOOBalance(
                lastMintEmissionMultiple + multiplier,
                lastMintGooBalance,
                uint256(toDaysWadUnsafe(block.timestamp - lastMintTimestamp))
            ) -
            LibGOO.computeGOOBalance(
                lastMintEmissionMultiple,
                lastMintGooBalance,
                uint256(toDaysWadUnsafe(block.timestamp - lastMintTimestamp))
            );
    }

    /*//////////////////////////////////////////////////////////////
                INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Mints mGOB tokens to the receiver
    /// @dev If deposit tax is active (0.5% tokens) sends the deposit tax to the owner
    /// @param multiplierToMint the multiplier of the Gobbler deposited
    /// @param conversionRate the conversion rate at the time of the erc20 token mint
    /// @param receiver the receiver of the erc20 tokens
    function _mgobMint(
        uint256 multplierToMint,
        uint256 conversionRate,
        address receiver
    ) internal {
        // mint the mGOB tokens to receiver
        if (totalMinted > DEPOSIT_TAX_START_AFTER) {
            uint256 depositTax = (multplierToMint * conversionRate * TAX_RATE) / PRECISION;
            _mint(taxAddress, depositTax);
            _mint(receiver, multplierToMint * conversionRate - depositTax);
        } else {
            _mint(receiver, multplierToMint * conversionRate);
        }
    }

    /*//////////////////////////////////////////////////////////////
                STATE CHANGING PUBLIC FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Deposit Gobbler into the vault and get mGOB tokens proportional to multiplier of the Gobbler
    /// @dev This requires an approve before the deposit
    /// @dev If GooDeposit is non-zero then take goo with Gobbler and also add it into Vault's virtual balance
    /// @param id id of the gobbler to mint
    function deposit(uint256 id) public {
        // multiplier of to be deposited gobbler
        uint256 multiplier = artGobbler.getGobblerEmissionMultiple(id);
        // transfer art gobbler into the vault
        artGobbler.safeTransferFrom(msg.sender, address(this), id);
        // transfer go debt into the vault
        uint256 gooDeposit = getGooDeposit(multiplier);
        if (gooDeposit > 0) {
            bool success = goo.transferFrom(msg.sender, address(this), gooDeposit);
            if (!success) revert GooDepositFailed();
            // adds any goo erc20 balance into the vaults virtual balance
            artGobbler.addGoo(goo.balanceOf(address(this)));
        }
        _mgobMint(multiplier, getConversionRate(), msg.sender);
    }

    /// @notice Withdraw Gobbler from the vault and burn mGOB tokens proportional to multiplier of the Gobbler
    /// @dev Cannot withdraw an unrevealed Gobbler i.e. multiplier = 0
    /// @param id id of the gobbler to withdraw
    function withdraw(uint256 id) public {
        // multiplier of to be withdrawn gobbler
        uint256 multiplier = artGobbler.getGobblerEmissionMultiple(id);
        if (multiplier == 0) revert UnrevealedGobbler();
        // burn the mGOB tokens to depositor
        _burn(msg.sender, multiplier * getConversionRate());
        // transfer art gobbler to the withdrawer
        artGobbler.safeTransferFrom(address(this), msg.sender, id);
    }

    /// @notice Deposit Gobbler in between mints without depositing any Goo,
    /// @dev Updates the mapping laggingDeposit for the user to be able to claim tokens equal to deposited multiplier
    /// @dev Updates the variable totalLaggedMultiple so that the conversionRate does not change due to a lagged deposit
    /// @dev mGOB tokens can only be claimed after a new Gobbler is minted
    /// @param id id of the gobbler to deposit
    function depositWithLag(uint256 id) public {
        // multiplier of to be deposited gobbler
        uint256 multiplier = artGobbler.getGobblerEmissionMultiple(id);
        // transfer art gobbler into the vault
        artGobbler.safeTransferFrom(msg.sender, address(this), id);
        // update users laggingDeposit amounts
        laggingDeposit[msg.sender][totalMinted] += multiplier;
        totalLaggedMultiple += multiplier;
    }

    /// @notice Claim the tokens from a lagged deposit
    /// @dev mGOB tokens can only be claimed after a new Gobbler is minted
    /// @dev Cannot claim if the minted Gobbler is unrevealed, this is done because conversion rate does not change
    /// @dev Updates the variable totalLaggedMultiple so that the conversionRate does not change due to a lagged deposit
    /// @param whenMinted which multipliers to claim
    function claimLagged(uint256[] calldata whenMinted) public {
        for (uint256 i = 0; i < whenMinted.length; ) {
            uint256 mintNumber = whenMinted[i];
            // cannot claim deposit if the next gobbler has not been minted
            if (totalMinted <= mintNumber) revert ClaimingInLowerMintWindow();
            // cannot claim deposit if the minted gobbler has not been revealed
            uint256 mintedGobblerMultiplier = artGobbler.getGobblerEmissionMultiple(mintedGobbledId[mintNumber]);
            if (mintedGobblerMultiplier == 0) revert MintedGobblerUnrevealed();
            uint256 sendersLaggedMultiple = laggingDeposit[msg.sender][mintNumber];
            _mgobMint(sendersLaggedMultiple, getConversionRate(), msg.sender);
            laggingDeposit[msg.sender][mintNumber] = 0;
            totalLaggedMultiple -= sendersLaggedMultiple;
            unchecked {
                ++i;
            }
        }
    }

    /// @notice Mint a gobbler from generated Goo
    /// @dev Any address can call this function and mint a Gobbler
    /// @dev Strategy should return Goo > GobblerPrice() for the transaction to succeed
    /// @dev Also stores emissionMultiple, GooBalance and Timestamp at time of mint
    /// @dev If someone withdraws Gobblers before calling this function
    /// @dev In expectation of paying less Goo balance on Deposit
    /// @dev They will lose out on minted multiplier rewards by the time they deposit
    function mintGobbler() public {
        mintedGobbledId[totalMinted] = artGobbler.mintFromGoo(mintStrategy.gobblerMintStrategy(), true);
        lastMintEmissionMultiple = artGobbler.getUserEmissionMultiple(address(this));
        lastMintGooBalance = artGobbler.gooBalance(address(this));
        lastMintTimestamp = block.timestamp;
        totalMinted += 1;
        emit GobblerMinted(mintedGobbledId[totalMinted]);
    }

    /// @notice Mint a legendary Gobbler from Gobblers in the vault
    /// @dev Any address can call this function and mint a Legendary Gobbler
    /// @dev Adding reentrancy guard since folks can deposit mint and then withdraw instantly after
    function mintLegendaryGobbler(uint256[] calldata gobblerIds) public nonReentrant {
        artGobbler.mintLegendaryGobbler(mintStrategy.legendaryGobblerMintStrategy(gobblerIds));
        emit LegendaryGobblerMinted(gobblerIds.length);
    }

    /// @notice Change the address of MintStrategy contract
    /// @dev Only owner can call this function
    /// @param _newStrategyAddress address of the new mint strategy
    function changeMintStrategy(address _newStrategyAddress) public onlyOwner {
        address oldStrategy = address(mintStrategy);
        mintStrategy = IMintStrategy(_newStrategyAddress);
        emit MintStrategyChanged(oldStrategy, _newStrategyAddress);
    }

    /// @notice Change the address of address which receives tax
    /// @dev Only owner can call this function
    /// @param _newTaxAddress address of the new mint strategy
    function changeTaxAddress(address _newTaxAddress) public onlyOwner {
        address oldTaxAddress = taxAddress;
        taxAddress = _newTaxAddress;
        emit TaxAddressChanged(oldTaxAddress, _newTaxAddress);
    }
}
