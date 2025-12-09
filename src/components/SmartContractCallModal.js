import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    ScrollView,
    Dimensions,
    Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import CommonText from '@components/commons/CommonText';
import CommonButton from '@components/commons/CommonButton';
import CommonImage from '@components/commons/CommonImage';
import Icon, { Icons } from '@components/icons/Icons';
import { WalletFactory } from '@modules/core/factory/WalletFactory';
import { walletConnectionProvider } from '@modules/walletconnect/WalletConnectionProvider';
import { ethers } from 'ethers';

const { width, height } = Dimensions.get('window');

const SmartContractCallModal = ({
    visible,
    onClose,
    onApprove,
    onReject,
    transactionData,
    dappInfo,
}) => {
    const { theme } = useSelector(state => state.ThemeReducer);
    const { activeWallet } = useSelector(state => state.WalletReducer);

    const [loading, setLoading] = useState(false);
    const [balance, setBalance] = useState(0);
    const [networkFee, setNetworkFee] = useState(0);
    const [totalCost, setTotalCost] = useState(0);
    const [insufficientBalance, setInsufficientBalance] = useState(false);
    const [currentWallet, setCurrentWallet] = useState(null);
    const [currentChain, setCurrentChain] = useState('BSC');
    const [showDetails, setShowDetails] = useState(false);
    const [showRawData, setShowRawData] = useState(false);

    useEffect(() => {
        if (visible && transactionData) {
            initializeTransactionData();
        }
    }, [visible, transactionData]);

    const initializeTransactionData = async () => {
        try {
            setLoading(true);
            
            const walletForTx = activeWallet;
            if (!walletForTx || Object.keys(walletForTx).length === 0) {
                console.error('No active wallet found');
                return;
            }
            setCurrentWallet(walletForTx);
            
            const chain = determineChain(transactionData);
            setCurrentChain(chain);

            const walletBalance = fetchWalletBalance(walletForTx, chain);
            setBalance(walletBalance);

            const feeValue = await calculateNetworkFee(transactionData, chain);
            setNetworkFee(feeValue);

            checkBalanceSufficiency(walletBalance, feeValue, transactionData);

        } catch (error) {
            console.error('Error initializing transaction data:', error);
            Alert.alert('Error', 'Failed to load transaction data');
        } finally {
            setLoading(false);
        }
    };

    const determineChain = (txData) => {
        if (txData?.chainId) {
            const chainMap = {
                '0x1': 'ETH',
                '0x38': 'BSC', 
                '0x89': 'POLYGON'
            };
            return chainMap[txData.chainId] || 'BSC';
        }
        if (txData?.chain) {
            return txData.chain.toUpperCase();
        }
        return walletConnectionProvider.getCurrentChain() || 'BSC';
    };

    const fetchWalletBalance = (wallet, chain) => {
        const activeAsset =
            wallet?.coins?.find(coin => coin.chain === chain) ||
            wallet?.tokens?.find(token => token.chain === chain) ||
            wallet?.activeAsset;
        if (!activeAsset) {
            console.error('No active asset found for chain:', chain);
            return 0;
        }
        const balanceValue = Number(activeAsset.balance) || 0;
        return Number.isFinite(balanceValue) ? balanceValue : 0;
    };

    const calculateNetworkFee = async (txData, chain) => {
        try {
            const gasPrice = txData?.gasPrice || txData?.maxFeePerGas;
            const gasLimit = txData?.gasLimit || txData?.gas;
            if (gasPrice && gasLimit) {
                const fee = ethers.BigNumber.from(gasPrice).mul(
                    ethers.BigNumber.from(gasLimit),
                );
                const feeInEth = parseFloat(ethers.utils.formatEther(fee));
                return Number.isFinite(feeInEth) ? feeInEth : 0;
            } else {
                const estimatedFee = await estimateGasFee(txData, chain);
                return estimatedFee;
            }
        } catch (error) {
            console.error('Error calculating network fee:', error);
            return 0;
        }
    };

    const estimateGasFee = async (txData, chain) => {
        try {
            const feeData = await WalletFactory.getTransactionFee(chain, {
                to: txData.to,
                value: txData.value || '0',
                data: txData.data || '0x',
            });
            
            if (feeData?.success) {
                const estimated =
                    parseFloat(feeData.data.estimateGas.ether) || 0;
                return Number.isFinite(estimated) ? estimated : 0;
            }
            return 0;
        } catch (error) {
            console.error('Error estimating gas fee:', error);
            return 0;
        }
    };

    const checkBalanceSufficiency = (walletBalance, feeValue, txData) => {
        let valueInEth = 0;
        try {
            if (txData?.value) {
                valueInEth = parseFloat(
                    ethers.utils.formatEther(
                        ethers.BigNumber.from(txData.value),
                    ),
                );
            }
        } catch (error) {
            console.error('Unable to parse transaction value', error);
        }

        const totalRequired = (valueInEth || 0) + (feeValue || 0);
        setTotalCost(totalRequired);
        setInsufficientBalance(walletBalance < totalRequired);
    };

    const handleApprove = async () => {
        if (insufficientBalance) {
            Alert.alert(
                'Insufficient Balance',
                'You need to top up your wallet before proceeding.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Top Up', onPress: handleTopUp }
                ]
            );
            return;
        }

        setLoading(true);
        try {
            await onApprove(transactionData);
            onClose();
        } catch (error) {
            console.error('Error approving transaction:', error);
            Alert.alert('Error', 'Failed to approve transaction');
        } finally {
            setLoading(false);
        }
    };

    const handleReject = () => {
        onReject();
        onClose();
    };

    const handleTopUp = () => {
        // Navigate to top up screen or show top up options
        Alert.alert('Top Up', 'Top up functionality will be implemented');
    };

    const formatAddress = (address) => {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const getChainIcon = (chain) => {
        const iconMap = {
            'ETH': 'ethereum',
            'BSC': 'binance',
            'POLYGON': 'polygon'
        };
        return iconMap[chain] || 'binance';
    };

    const getChainName = (chain) => {
        const nameMap = {
            'ETH': 'Ethereum',
            'BSC': 'BNB Smart Chain',
            'POLYGON': 'Polygon'
        };
        return nameMap[chain] || 'BNB Smart Chain';
    };

    if (!visible || !transactionData) return null;

    const CollapsibleCard = ({ title, icon, children, isExpanded, onToggle, summary }) => (
        <View style={[styles.card, { backgroundColor: theme.background2 }]}>
            <TouchableOpacity 
                style={styles.cardHeader} 
                onPress={onToggle}
                activeOpacity={0.7}
            >
                <View style={styles.cardHeaderLeft}>
                    <Icon 
                        type={Icons.MaterialIcons} 
                        name={icon} 
                        size={20} 
                        color={theme.text1} 
                        style={styles.cardIcon}
                    />
                    <View style={styles.cardTitleContainer}>
                        <CommonText style={[styles.cardTitle, { color: theme.text1 }]}>
                            {title}
                        </CommonText>
                        {!isExpanded && summary && (
                            <CommonText style={[styles.cardSummary, { color: theme.text2 }]}>
                                {summary}
                            </CommonText>
                        )}
                    </View>
                </View>
                <Icon 
                    type={Icons.MaterialIcons} 
                    name={isExpanded ? "expand-less" : "expand-more"} 
                    size={24} 
                    color={theme.text2} 
                />
            </TouchableOpacity>
            
            {isExpanded && (
                <Animated.View style={styles.cardContent}>
                    {children}
                </Animated.View>
            )}
        </View>
    );

    const DetailRow = ({ label, value, isAddress = false }) => (
        <View style={styles.detailRow}>
            <CommonText style={[styles.detailLabel, { color: theme.text2 }]}>
                {label}
            </CommonText>
            <CommonText style={[styles.detailValue, { color: theme.text1 }]}>
                {isAddress ? formatAddress(value) : value}
            </CommonText>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
                    {/* Header */}
                    <View style={[styles.header, { borderBottomColor: theme.border }]}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon type={Icons.AntDesign} name="close" size={24} color={theme.text1} />
                        </TouchableOpacity>
                        <CommonText style={[styles.headerTitle, { color: theme.text1 }]}>
                            Smart Contract Call
                        </CommonText>
                        <View style={styles.placeholder} />
                    </View>

                    <ScrollView 
                        style={styles.content} 
                        showsVerticalScrollIndicator={true}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {/* Balance Overview - Match Trust Wallet Design */}
                        <View style={[styles.balanceOverview, { backgroundColor: theme.background2 }]}>
                            <View style={styles.balanceHeader}>
                                <CommonImage
                                    source={{ uri: `https://cryptoicons.org/api/icon/${getChainIcon(currentChain)}/200` }}
                                    style={styles.chainIcon}
                                />
                                <View style={styles.balanceInfo}>
                                    <CommonText style={[styles.balanceAmount, { color: theme.text1 }]}>
                                        ${balance.toFixed(4)}
                                    </CommonText>
                                    <CommonText style={[styles.balanceUsd, { color: theme.text2 }]}>
                                        {balance.toFixed(4)} {currentChain}
                                    </CommonText>
                                </View>
                            </View>
                        </View>

                        {/* Transaction Details */}
                        <CollapsibleCard
                            title="Transaction Details"
                            icon="receipt"
                            isExpanded={showDetails}
                            onToggle={() => setShowDetails(!showDetails)}
                            summary={`${formatAddress(transactionData.to)} • ${getChainName(currentChain)}`}
                        >
                            <DetailRow 
                                label="From" 
                                value={currentWallet?.activeAsset?.walletAddress} 
                                isAddress={true}
                            />
                            <DetailRow 
                                label="Contract" 
                                value={transactionData.to} 
                                isAddress={true}
                            />
                            <DetailRow 
                                label="Network" 
                                value={getChainName(currentChain)}
                            />
                            <DetailRow 
                                label="DApp" 
                                value={dappInfo?.name || 'Unknown DApp'}
                            />
                        </CollapsibleCard>

                        {/* Network Fee Card - Match Trust Wallet Design */}
                        <View style={[styles.networkFeeCard, { backgroundColor: theme.background2 }]}>
                            <View style={styles.feeHeader}>
                                <View style={styles.feeHeaderLeft}>
                                    <CommonText style={[styles.feeLabel, { color: theme.text2 }]}>
                                        Network fee
                                    </CommonText>
                                    <Icon type={Icons.MaterialIcons} name="info-outline" size={16} color={theme.text2} />
                                </View>
                                <View style={styles.feeAmountContainer}>
                                    <View style={styles.feeAmountRow}>
                                        <CommonImage
                                            source={{ uri: `https://cryptoicons.org/api/icon/${getChainIcon(currentChain)}/200` }}
                                            style={styles.feeChainIcon}
                                        />
                                        <CommonText style={[styles.feeAmount, { color: theme.text1 }]}>
                                            ${networkFee.toFixed(6)}
                                        </CommonText>
                                    </View>
                                    <CommonText style={[styles.feeAmountToken, { color: theme.text2 }]}>
                                        {networkFee.toFixed(6)} {currentChain}
                                    </CommonText>
                                </View>
                            </View>
                        </View>

                        {/* Raw Data */}
                        <CollapsibleCard
                            title="Raw Transaction Data"
                            icon="code"
                            isExpanded={showRawData}
                            onToggle={() => setShowRawData(!showRawData)}
                            summary="View raw transaction data"
                        >
                            <View style={[styles.rawDataContainer, { backgroundColor: theme.background }]}>
                                <CommonText style={[styles.rawDataText, { color: theme.text2 }]}>
                                    {JSON.stringify(transactionData, null, 2)}
                                </CommonText>
                            </View>
                        </CollapsibleCard>

                        {/* Insufficient Balance Warning - Match Trust Wallet Design */}
                        {insufficientBalance && (
                            <View style={[styles.warningCard, { backgroundColor: '#FFF3CD' }]}>
                                <View style={styles.warningHeader}>
                                    <Icon type={Icons.MaterialIcons} name="info" size={20} color="#856404" />
                                    <CommonText style={[styles.warningText, { color: '#856404' }]}>
                                        Insufficient {getChainName(currentChain)} ({currentChain}) balance
                                    </CommonText>
                                </View>
                                <TouchableOpacity onPress={handleTopUp}>
                                    <CommonText style={[styles.learnMore, { color: theme.longColor }]}>
                                        Learn more
                                    </CommonText>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Total Cost - Match Trust Wallet Design */}
                        <View style={[styles.totalCostRow, { borderTopColor: theme.border }]}>
                            <CommonText style={[styles.totalCostLabel, { color: theme.text1 }]}>
                                Total cost
                            </CommonText>
                            <CommonText style={[styles.totalCostAmount, { color: theme.text1 }]}>
                                ${totalCost.toFixed(6)}
                            </CommonText>
                        </View>
                        
                        {/* Bottom padding for sticky button */}
                        <View style={{ height: 100 }} />
                    </ScrollView>

                    {/* Sticky Action Button - Match Trust Wallet Design */}
                    <View style={styles.actionContainer}>
                        {insufficientBalance ? (
                            <CommonButton
                                text={`Top up ${getChainName(currentChain)} (${currentChain})`}
                                onPress={handleTopUp}
                                style={[styles.actionButton, { backgroundColor: theme.longColor }]}
                                textStyle={styles.actionButtonText}
                            />
                        ) : (
                            <CommonButton
                                text="Approve Transaction"
                                onPress={handleApprove}
                                style={[styles.actionButton, { backgroundColor: theme.longColor }]}
                                textStyle={styles.actionButtonText}
                                loading={loading}
                            />
                        )}
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        height: height * 0.9,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        paddingTop: 15,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 0.5,
    },
    closeButton: {
        padding: 10,
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        flexGrow: 1,
    },
    // Trust Wallet style balance overview
    balanceOverview: {
        borderRadius: 16,
        padding: 20,
        marginVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    balanceHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    chainIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        marginRight: 18,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    balanceInfo: {
        flex: 1,
    },
    balanceAmount: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 3,
        letterSpacing: -0.3,
    },
    balanceUsd: {
        fontSize: 14,
        opacity: 0.7,
        fontWeight: '500',
    },
    balanceStatus: {
        marginLeft: 18,
    },
    // Trust Wallet style collapsible cards
    card: {
        borderRadius: 16,
        marginVertical: 10,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 18,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    cardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    cardIcon: {
        marginRight: 14,
        opacity: 0.8,
    },
    cardTitleContainer: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 3,
        letterSpacing: -0.3,
    },
    cardSummary: {
        fontSize: 13,
        opacity: 0.7,
        fontWeight: '400',
    },
    cardContent: {
        paddingHorizontal: 18,
        paddingBottom: 18,
    },
    // Trust Wallet style detail rows
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 10,
        marginVertical: 2,
    },
    detailLabel: {
        fontSize: 14,
        flex: 1,
        fontWeight: '500',
        opacity: 0.8,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'right',
        letterSpacing: -0.2,
    },
    // Trust Wallet style network fee card
    networkFeeCard: {
        borderRadius: 16,
        padding: 18,
        marginVertical: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    feeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    feeHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    feeLabel: {
        fontSize: 14,
        fontWeight: '500',
        opacity: 0.8,
        marginRight: 4,
    },
    feeAmountContainer: {
        alignItems: 'flex-end',
    },
    feeAmountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    feeChainIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        marginRight: 8,
    },
    feeAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: -0.3,
    },
    feeAmountToken: {
        fontSize: 12,
        opacity: 0.7,
    },
    // Total cost row
    totalCostRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderTopWidth: 0.5,
        marginTop: 10,
    },
    totalCostLabel: {
        fontSize: 16,
        fontWeight: '500',
        letterSpacing: -0.3,
    },
    totalCostAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: -0.3,
    },
    // Trust Wallet style raw data
    rawDataContainer: {
        borderRadius: 12,
        padding: 16,
        marginTop: 10,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    rawDataText: {
        fontSize: 12,
        fontFamily: 'monospace',
        lineHeight: 16,
        opacity: 0.8,
    },
    // Trust Wallet style warning card
    warningCard: {
        borderRadius: 12,
        padding: 16,
        marginVertical: 10,
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    warningText: {
        fontSize: 14,
        marginLeft: 8,
        flex: 1,
    },
    learnMore: {
        fontSize: 14,
        fontWeight: '500',
    },
    // Trust Wallet style action buttons
    actionContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    actionButton: {
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
});

export default SmartContractCallModal;
