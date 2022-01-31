// Copyright 2019-2020 @Premiurly/polkassembly authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { web3Accounts, web3Enable, web3FromSource } from '@polkadot/extension-dapp';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { stringToHex } from '@polkadot/util';
import styled from '@xstyled/styled-components';
import React, { useContext, useState } from 'react';
import { DropdownProps, Icon } from 'semantic-ui-react';
import HelperTooltip from 'src/ui-components/HelperTooltip';

import { ApiContext } from '../../context/ApiContext';
import { NotificationContext } from '../../context/NotificationContext';
import { UserDetailsContext } from '../../context/UserDetailsContext';
import { useMultisigLinkConfirmMutation, useMultisigLinkStartMutation } from '../../generated/graphql';
import { APPNAME } from '../../global/appName';
import { chainProperties } from '../../global/networkConstants';
import { handleTokenChange } from '../../services/auth.service';
import { NotificationStatus } from '../../types';
import AccountSelectionForm from '../../ui-components/AccountSelectionForm';
import AddressComponent from '../../ui-components/Address';
import Button from '../../ui-components/Button';
import FilteredError from '../../ui-components/FilteredError';
import { Form } from '../../ui-components/Form';
import Modal from '../../ui-components/Modal';
import cleanError from '../../util/cleanError';
import getEncodedAddress from '../../util/getEncodedAddress';
import getNetwork from '../../util/getNetwork';

const NETWORK = getNetwork();

const Multisig = ({ className }: {className?: string}): JSX.Element => {
	const currentUser = useContext(UserDetailsContext);
	const [showModal, setShowModal] = useState(false);
	const [multisigAddress, setMultisigAddress] = useState<string>('');
	const [signatories, setSignatories] = useState<any>({ 0: '' });
	const [threshold, setThreshold] = useState(0);
	const [signatory, setSignatory] = useState<string>('');
	const [showSignatoryAccounts, setShowSignatoryAccounts] = useState(false);
	const [signatoryAccounts, setSignatoryAccounts] = useState<InjectedAccountWithMeta[]>([]);
	const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
	const [extensionNotAvailable, setExtensionNotAvailable] = useState(false);
	const [extensionNotFound, setExtensionNotFound] = useState(false);
	const [accountsNotFound, setAccountsNotFound] = useState(false);
	const [linkStarted, setLinkStarted] = useState(false);
	const [multisigLinkStartMutation, { error: startError }] = useMultisigLinkStartMutation();
	const [multisigLinkConfirmMutation, { loading, error }] = useMultisigLinkConfirmMutation();
	const { queueNotification } = useContext(NotificationContext);
	const { api, apiReady } = useContext(ApiContext);

	const openModal = () => {
		setShowModal(true);
	};
	const dismissModal = () => {
		setShowModal(false);
	};

	const onAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => setMultisigAddress(event.currentTarget.value);
	const onThresholdChange = (event: React.ChangeEvent<HTMLInputElement>) => setThreshold(Number(event.currentTarget.value));
	const onAccountChange = (event: React.SyntheticEvent<HTMLElement, Event>, data: DropdownProps) => {
		const addressValue = data.value as string;
		setSignatory(addressValue);
	};

	const isSelected = (address: string) => {
		let isSelected = false;
		Object.keys(signatories).forEach((key) => {
			if (signatories[key] === address) {
				isSelected = true;
			}
		});
		return isSelected;
	};

	const getSignatoriesArray = () => {
		const signatoriesArray: any[] = [];
		Object.keys(signatories).forEach((key) => {
			if(signatories[key] !== '') {
				signatoriesArray.push(signatories[key]);
			}
		});
		return signatoriesArray;
	};

	const onSignatoriesAddressChange = (e:any) => {
		setSignatories({ ...signatories, [e.target.id]: e.target.value });
	};

	const onSignatoriesAddressRemove = (e:any) => {
		const oldSignatories = { ...signatories };
		delete oldSignatories[e.target.id];
		let i = 0;
		const newSignatories = {};
		Object.keys(oldSignatories).forEach((key) => {
			// @ts-ignore
			newSignatories[i] = oldSignatories[key];
			i++;
		});
		setSignatories(newSignatories);
	};

	const handleAddSignatories = (address = '') => {
		if (!isSelected(address)) {
			setSignatories({ ...signatories, [Object.keys(signatories).length]: address });
		}
	};

	const handleDetect = async () => {
		const extensions = await web3Enable(APPNAME);
		if (extensions.length === 0) {
			setExtensionNotAvailable(true);
			return;
		} else {
			setExtensionNotAvailable(false);
		}

		const allAccounts = await web3Accounts();
		setSignatoryAccounts(allAccounts);
		setShowSignatoryAccounts(!showSignatoryAccounts);
	};

	const handleLink = async (): Promise<undefined> => {
		if (!api) {
			return;
		}

		if (!apiReady) {
			return;
		}

		const extensions = await web3Enable(APPNAME);

		if (extensions.length === 0) {
			setExtensionNotFound(true);
			return;
		} else {
			setExtensionNotFound(false);
		}

		const availableAccounts = await web3Accounts();

		availableAccounts.forEach((account) => {
			account.address = getEncodedAddress(account.address) || account.address;
		});

		const accounts = availableAccounts.filter((account) => {
			return getSignatoriesArray().map(address => address.trim()).filter(address => !!address).includes(account.address);
		});

		if (accounts.length === 0) {
			setAccountsNotFound(true);
			return;
		} else {
			setAccountsNotFound(false);
		}

		setAccounts(accounts);
		if (accounts.length > 0) {
			setSignatory(accounts[0].address);

			const injected = await web3FromSource(accounts[0].meta.source);

			api.setSigner(injected.signer);
		}

		setLinkStarted(true);
		return;
	};

	const handleSign = async () => {
		if (!accounts.length) {
			return;
		}

		try {
			const injected = await web3FromSource(accounts[0].meta.source);
			const signRaw = injected && injected.signer && injected.signer.signRaw;

			if (!signRaw) {
				return console.error('Signer not available');
			}

			const multisigLinkStartResult = await multisigLinkStartMutation({
				variables: {
					address: multisigAddress
				}
			});

			if (!multisigLinkStartResult?.data?.multisigLinkStart) {
				return console.error('Multisig link start mutaion failed');
			}

			const { signature } = await signRaw({
				address: signatory,
				data: stringToHex(multisigLinkStartResult.data.multisigLinkStart.signMessage || ''),
				type: 'bytes'
			});
			const multisigLinkConfirmResult = await multisigLinkConfirmMutation({
				variables: {
					address: multisigAddress,
					addresses: getSignatoriesArray().join(','),
					network: NETWORK,
					signatory,
					signature,
					ss58Prefix: chainProperties?.[NETWORK]?.ss58Format,
					threshold
				}
			});

			if (multisigLinkConfirmResult.data?.multisigLinkConfirm?.token) {
				handleTokenChange(multisigLinkConfirmResult.data?.multisigLinkConfirm?.token, currentUser);
			}

			queueNotification({
				header: 'Success!',
				message: multisigLinkConfirmResult?.data?.multisigLinkConfirm?.message || '',
				status: NotificationStatus.SUCCESS
			});

			dismissModal();
		} catch (error) {
			console.error(error);
			queueNotification({
				header: 'Failed!',
				message: cleanError(error.message),
				status: NotificationStatus.ERROR
			});
		}
	};

	const getSignatoryAccounts = () => {
		return (
			<Form.Group className='fullWidth'>
				<Form.Field className='fullWidth '>
					{signatoryAccounts.map(account => {
						const address = getEncodedAddress(account.address);

						return address &&
							<div key={address} onClick={() => handleAddSignatories(address)} className='signatoryItem'>
								<div className='item'>
									<AddressComponent className='item' address={address} extensionName={account.meta.name} />
								</div>
								{isSelected(address) ? <Icon name='check circle outline' /> : <Icon name='add circle' />}
							</div>;
					})}
				</Form.Field>
			</Form.Group>
		);
	};

	return (
		<>
			{showModal ?
				<Modal
					className={className}
					buttons={
						<Form.Group>
							{linkStarted ?
								<Button
									content='Sign'
									disabled={loading}
									icon='check'
									primary
									onClick={handleSign}
								/> :
								<Button
									content='Link'
									disabled={loading}
									icon='check'
									primary
									onClick={handleLink}
								/>
							}
						</Form.Group>
					}
					centered
					dimmer='inverted'
					open
					onClose={dismissModal}
					size='tiny'
					title={'Link Multisig address'}
				>
					<Form standalone={false}>
						<Form.Group>
							<Form.Field width={16}>
								<label>
									Signatory Addresses
									<HelperTooltip content='The signatories (aka co-owners) have the ability to create transactions using the multisig and approve transactions sent by others. But, only once the threshold (set while creating a multisig account) is reached with approvals, the multisig transaction is enacted on-chain.' />
								</label>
								{Object.keys(signatories).map(i => (
									<div key={i} className="signatoryChild">
										<input key={i} id={i} value={signatories[i]} onChange={onSignatoriesAddressChange} placeholder='Enter signatory addresses for multisig account' />
										<div className="closeIcon"><Icon name='minus circle' id={i} onClick={onSignatoriesAddressRemove}/></div>
									</div>
								))}
								{!extensionNotAvailable && <div className='signatoryOptions'>
									<div onClick={handleDetect} className='signatoryToggle'>
										Choose from available addresses
										{showSignatoryAccounts ? <Icon name='chevron up' /> : <Icon name='chevron down' />}
									</div>
									<div className='signatoryToggle' onClick={() => handleAddSignatories('')}>+ Add account address</div>
								</div>}
								{extensionNotAvailable && <div className="error">Please install polkadot.js extension</div>}
							</Form.Field>
						</Form.Group>
						<Form.Group>
							{showSignatoryAccounts && signatoryAccounts.length > 0 && getSignatoryAccounts()}
						</Form.Group>
						<Form.Group>
							<Form.Field width={16}>
								<label>
									Multisig Address
									<HelperTooltip content='This is the address of the multisig account with the above signatories.' />
								</label>
								<input
									value={multisigAddress}
									onChange={onAddressChange}
									placeholder='Enter valid multisig address'
									type='text'
								/>
							</Form.Field>
						</Form.Group>
						<Form.Group>
							<Form.Field width={16}>
								<label>
									Threshold
									<HelperTooltip content='Threshold is the amount of signature weight required to authorize any transaction. The threshold for approval should be less or equal to the number of signatories for a multisig.' />
								</label>
								<input
									value={threshold || ''}
									onChange={onThresholdChange}
									placeholder='threshold'
									type='number'
									min={1}
									max={100}

								/>
							</Form.Field>
						</Form.Group>
						{accounts.length > 0 ? <Form.Group>
							<Form.Field width={16}>
								<AccountSelectionForm
									title='Sign with account'
									accounts={accounts}
									address={signatory}
									onAccountChange={onAccountChange}
								/>
							</Form.Field>
						</Form.Group> : null}
						{extensionNotFound ? <div className='error'>
							<div>Please install polkadot.js extension</div>
						</div> : null}

						{accountsNotFound ? <div className='error'>
							<div>At least one signatory account should be in your polkadot js extension.</div>
							<div>Please reload this page after adding accounts.</div>
						</div> : null}
						{startError?.message && <FilteredError text={startError.message}/>}
						{error?.message && <FilteredError text={error.message}/>}
					</Form>
				</Modal>
				: null
			}
			<Form standalone={false} id='linkMultisigAccount'>
				<Form.Group>
					<Form.Field width={16}>
						<label>Multisig</label>
						<div className='text-muted'>You can link a <a rel='noopener noreferrer' target='_blank' href='https://wiki.polkadot.network/docs/learn-accounts#multi-signature-accounts'>multi signature address</a> here.</div>
						<Button
							primary
							disabled={loading}
							onClick={openModal}
							type="submit"
						>
							Link Multisig Address
						</Button>
					</Form.Field>
				</Form.Group>
			</Form>
		</>
	);
};

export default styled(Multisig)`
	.fullWidth {
		width: 100%;
	}
	.signatoryItem {
		margin-bottom: 10px;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.error {
		color: red_secondary;
		font-size: sm;
	}
	.signatoryOptions{ 
		display: flex;
		justify-content: space-between;
	}
	.signatoryToggle {
		color: pink_primary;
		cursor: pointer;
	}
	.signatoryChild {
		position: relative;
	}
	.closeIcon {
		position: absolute;
		top: 11px;
		right: 4px;
	}
`;