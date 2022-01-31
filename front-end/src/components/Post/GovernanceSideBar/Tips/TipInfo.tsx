// Copyright 2019-2020 @Premiurly/polkassembly authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import styled from '@xstyled/styled-components';
import BN from 'bn.js';
import React, { useContext, useEffect, useState } from 'react';
import { Grid } from 'semantic-ui-react';
import { ApiContext } from 'src/context/ApiContext';
import HelperTooltip from 'src/ui-components/HelperTooltip';
import NothingFoundCard from 'src/ui-components/NothingFoundCard';
import formatBnBalance from 'src/util/formatBnBalance';

import Address from '../../../../ui-components/Address';
import Card from '../../../../ui-components/Card';
import Loader from '../../../../ui-components/Loader';

interface Props {
	className?: string
	onChainId: string
}

const Median = (data: any, members: string[]): [BN, BN, string, string] => {
	let median = new BN(0);
	let findersFee = new BN(0);
	let receiver = '';
	let finder = '';

	if (data?.tips?.length > 0) {
		const values: BN[] = data.tips.map(([, value]: [string, BN]) => value).sort((a: BN, b: BN) => new BN(a).cmp(new BN(b)));
		const midIndex = Math.floor(values.length / 2);
		median = values.length
			? values.length % 2
				? values[midIndex]
				: new BN(values[midIndex - 1]).add(new BN(values[midIndex])).divn(2)
			: new BN(0);
		receiver = data.who;
		finder = data.finder;
		if (data.finder != data.who && !members.includes(data.finder) && median != new BN(0)) {
			findersFee = new BN(median).divn(5); // 20% of median value
			median = new BN(median).sub(findersFee);

		}
	}

	return [median, findersFee, finder, receiver];
};

const TipInfo = ({ className, onChainId }: Props) => {

	const { api, apiReady } = useContext(ApiContext);
	const [tips, setTips] = useState<any>(null);
	const [isTippersLoading, setIsTippersLoading] = useState(true);
	const [members, setMembers] = useState<string[]>([]);
	const [median, setMedian] = useState<BN>(new BN(0));
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [findersFee, setFindersFee] = useState<BN>(new BN(0));
	//eslint-disable-next-line @typescript-eslint/no-unused-vars
	const [finder, setFinder] = useState<string>('');
	const [receiver, setReceiver] = useState<string>('');

	useEffect(() => {
		if (!api) {
			return;
		}

		if (!apiReady) {
			return;
		}

		let unsubscribe: () => void;

		api.query.council.members().then((members) => {
			setMembers(members.map(member => member.toString()));
		});

		api.query.tips.tips.multi([onChainId]).then(tip => {
			setTips(tip[0]?.toJSON());
			setIsTippersLoading(false);
			const [adjustedMedian, findersFee, finder, receiver] = Median(tip[0]?.toJSON(), members);
			setMedian(adjustedMedian);
			setFindersFee(findersFee);
			setReceiver(receiver);
			setFinder(finder);

		});

		return () => unsubscribe && unsubscribe();
	}, [api, apiReady, isTippersLoading, onChainId, members]);

	const pendingTippers = members.filter(item => !tips?.tips.includes(item));

	return (
		<>
			{tips?.tips.length > 0 ?
				<Card className={className}>
					<h3>Final Tip<HelperTooltip content='The final value of the tip is decided based on the median of all tips issued by the tippers' /></h3>
					<Grid>
						<Grid.Row key={receiver}>
							<Grid.Column width={12}>
								<div className='item'>
									<h6>Receiver</h6>
									<Address address={receiver} />
								</div></Grid.Column>
							<Grid.Column width={4}>
								{formatBnBalance(median, { numberAfterComma: 2, withUnit: true })}
							</Grid.Column>
						</Grid.Row>
					</Grid>
					<h3>Tippers <HelperTooltip content='Amount tipped by an individual/organisation' /></h3>
					<Grid className='tippers'>
						{tips.tips.map((tip: any[]) =>
							<Grid.Row key={tip[0]}>
								<Grid.Column width={12}>
									<div className='item'>
										<Address address={tip[0]} />
									</div>
								</Grid.Column>
								<Grid.Column width={4}>
									{formatBnBalance(tip[1], { numberAfterComma: 2, withUnit: true })}
								</Grid.Column>
							</Grid.Row>
						)}
						{pendingTippers.map((tip: string) =>
							<Grid.Row key={tip}>
								<Grid.Column width={12}>
									<div className='item'>
										<Address address={tip} />
									</div>
								</Grid.Column>
								<Grid.Column width={4}>
									Pending
								</Grid.Column>
							</Grid.Row>
						)}
					</Grid>
				</Card>
				: isTippersLoading ? <Loader text={'Requesting Tippers'} /> : <NothingFoundCard className={className} text='There are currently no tippers.' />}
		</>
	);
};

export default styled(TipInfo)`
.tippers {
    margin-top: 2em;
}

h3 {
	margin-top:20px;
}

h6 {
	font-family: font_mono;
	font-size: sm;
}

@media only screen and (max-width: 768px) {
    .ui.form {
        padding: 0rem;
    }
}
`;