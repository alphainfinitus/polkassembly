// Copyright 2019-2020 @Premiurly/polkassembly authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import AuthService from '../../services/auth';
import { EditPostArgs, MessageType } from '../../types';

export default async (parent: void, {
	network,
	address,
	title,
	content,
	signature,
	proposalType,
	proposalId
}: EditPostArgs): Promise<MessageType> => {
	const authServiceInstance = new AuthService();

	await authServiceInstance.EditPostConfirm(
		network,
		address,
		title,
		content,
		signature,
		proposalType,
		proposalId
	);

	return { message: 'Post edited successfully' };
};
