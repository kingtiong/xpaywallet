import React, {useMemo, useState} from 'react';
import {
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import {useSelector} from 'react-redux';
import CommonText from '@components/commons/CommonText';
import CommonButton from '@components/commons/CommonButton';
import Icon, {Icons} from '@components/icons/Icons';

const getRequestTitle = method => {
    switch (method) {
        case 'eth_requestAccounts':
            return 'Connection Request';
        case 'eth_accounts':
            return 'Account Request';
        case 'personal_sign':
        case 'eth_sign':
        case 'eth_signTypedData':
        case 'eth_signTypedData_v3':
        case 'eth_signTypedData_v4':
            return 'Signature Request';
        case 'eth_sendTransaction':
            return 'Transaction Request';
        case 'wallet_switchEthereumChain':
            return 'Switch Network';
        case 'wallet_addEthereumChain':
            return 'Add Network';
        case 'wallet_showAlert':
            return 'Alert';
        case 'wallet_showConfirm':
            return 'Confirmation';
        default:
            return 'Web3 Request';
    }
};

const extractMessage = requestData => {
    const params = requestData?.params;
    if (!Array.isArray(params) || params.length === 0) {
        return null;
    }

    const first = params[0];
    if (typeof first === 'string') {
        return first;
    }
    if (first && typeof first === 'object') {
        return (
            first.message ||
            first.content ||
            first.description ||
            first.text ||
            null
        );
    }
    return null;
};

export default function Web3RequestModal({
    visible,
    onClose,
    onApprove,
    onReject,
    requestData,
    dappInfo,
}) {
    const {theme} = useSelector(state => state.ThemeReducer);
    const [loading, setLoading] = useState(false);

    const title = useMemo(
        () => getRequestTitle(requestData?.method),
        [requestData?.method],
    );
    const message = useMemo(() => extractMessage(requestData), [requestData]);

    const isAlert = requestData?.method === 'wallet_showAlert';
    const isConfirm = requestData?.method === 'wallet_showConfirm';

    if (!visible || !requestData) return null;

    const handleApprove = async () => {
        try {
            setLoading(true);
            await onApprove?.(requestData);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        try {
            setLoading(true);
            await onReject?.(requestData);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <SafeAreaView
                    style={[
                        styles.modalContainer,
                        {backgroundColor: theme?.background || '#fff'},
                    ]}>
                    {/* Header */}
                    <View
                        style={[
                            styles.header,
                            {borderBottomColor: theme?.border || 'rgba(0,0,0,0.1)'},
                        ]}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            activeOpacity={0.7}>
                            <Icon
                                type={Icons.MaterialIcons}
                                name="close"
                                size={24}
                                color={theme?.text2 || '#666'}
                            />
                        </TouchableOpacity>
                        <CommonText
                            style={[
                                styles.headerTitle,
                                {color: theme?.text1 || theme?.text || '#111'},
                            ]}>
                            {dappInfo?.name || title}
                        </CommonText>
                        <View style={styles.headerRight} />
                    </View>

                    {/* Body */}
                    <View style={styles.body}>
                        <View
                            style={[
                                styles.card,
                                {backgroundColor: theme?.background2 || theme?.background4 || '#f7f7f7'},
                            ]}>
                            <CommonText style={[styles.label, {color: theme?.text2 || '#666'}]}>
                                Request
                            </CommonText>
                            <CommonText style={[styles.value, {color: theme?.text1 || theme?.text || '#111'}]}>
                                {title} ({requestData.method})
                            </CommonText>

                            {!!dappInfo?.url && (
                                <>
                                    <CommonText style={[styles.label, {color: theme?.text2 || '#666'}]}>
                                        Origin
                                    </CommonText>
                                    <CommonText
                                        numberOfLines={2}
                                        style={[
                                            styles.value,
                                            {color: theme?.text1 || theme?.text || '#111'},
                                        ]}>
                                        {dappInfo.url}
                                    </CommonText>
                                </>
                            )}
                        </View>

                        {(message || requestData?.params) && (
                            <View
                                style={[
                                    styles.card,
                                    {backgroundColor: theme?.background2 || theme?.background4 || '#f7f7f7'},
                                ]}>
                                <CommonText style={[styles.label, {color: theme?.text2 || '#666'}]}>
                                    Details
                                </CommonText>
                                {message ? (
                                    <CommonText
                                        style={[
                                            styles.value,
                                            {color: theme?.text1 || theme?.text || '#111'},
                                        ]}>
                                        {String(message)}
                                    </CommonText>
                                ) : (
                                    <ScrollView style={styles.codeBox} nestedScrollEnabled>
                                        <CommonText
                                            style={[
                                                styles.codeText,
                                                {color: theme?.text2 || '#666'},
                                            ]}>
                                            {JSON.stringify(requestData.params, null, 2)}
                                        </CommonText>
                                    </ScrollView>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Actions */}
                    <View style={styles.actionButtons}>
                        {!isAlert && (
                            <CommonButton
                                title={isConfirm ? 'Cancel' : 'Reject'}
                                onPress={handleReject}
                                loading={loading}
                                style={[
                                    styles.rejectButton,
                                    {
                                        borderColor: theme?.border || '#e0e0e0',
                                        backgroundColor: theme?.background2 || '#f5f5f5',
                                    },
                                ]}
                                textStyle={[
                                    styles.rejectButtonText,
                                    {color: theme?.text2 || '#666'},
                                ]}
                            />
                        )}
                        <CommonButton
                            title={isAlert ? 'OK' : isConfirm ? 'Confirm' : 'Approve'}
                            onPress={handleApprove}
                            loading={loading}
                            style={[
                                styles.approveButton,
                                {backgroundColor: theme?.longColor || '#007AFF'},
                            ]}
                            textStyle={styles.approveButtonText}
                        />
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        height: '75%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    closeButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    headerRight: {
        width: 34,
    },
    body: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    card: {
        borderRadius: 12,
        padding: 14,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        opacity: 0.8,
    },
    value: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 10,
    },
    codeBox: {
        maxHeight: 220,
        borderRadius: 10,
        padding: 10,
        backgroundColor: 'rgba(0,0,0,0.04)',
    },
    codeText: {
        fontSize: 12,
        fontFamily: 'monospace',
        lineHeight: 16,
    },
    actionButtons: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 12,
    },
    rejectButton: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 16,
    },
    rejectButtonText: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    approveButton: {
        flex: 1,
        borderRadius: 12,
        paddingVertical: 16,
    },
    approveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});

