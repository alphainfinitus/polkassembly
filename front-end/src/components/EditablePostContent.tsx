// Copyright 2019-2020 @Premiurly/polkassembly authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import styled from '@xstyled/styled-components';
import { ApolloQueryResult } from 'apollo-client';
import React, { useContext, useEffect,useState } from 'react';
import { Controller,useForm } from 'react-hook-form';
import { GoCheck, GoLink, GoX } from 'react-icons/go';
import { Input, InputOnChangeData } from 'semantic-ui-react';

import { NotificationContext } from '../context/NotificationContext';
import { DiscussionPostAndCommentsQuery,
	DiscussionPostFragment,
	MotionPostAndCommentsQuery,
	MotionPostFragment,
	ProposalPostAndCommentsQuery,
	ProposalPostFragment,
	ReferendumPostAndCommentsQuery,
	ReferendumPostFragment,
	TipPostAndCommentsQuery,
	TipPostFragment,
	TreasuryProposalPostAndCommentsQuery,
	TreasuryProposalPostFragment,
	useDiscussionPostAndCommentsLazyQuery,
	useEditPostMutation
} from '../generated/graphql';
import { NotificationStatus } from '../types';
import Button from '../ui-components/Button';
import FilteredError from '../ui-components/FilteredError';
import { Form } from '../ui-components/Form';
import Loader from '../ui-components/Loader';
import Modal from '../ui-components/Modal';
import ContentForm from './ContentForm';
import PostContent from './Post/PostContent';
import TitleForm from './TitleForm';

interface Props {
	className?: string
	isEditing: boolean
	isTipProposal: boolean
	onchainId?: string | number | null
	post: DiscussionPostFragment | ProposalPostFragment | ReferendumPostFragment | TipPostFragment | TreasuryProposalPostFragment| MotionPostFragment
	postStatus?: string
	refetch: (variables?: any) => Promise<ApolloQueryResult<ReferendumPostAndCommentsQuery>>
		| Promise<ApolloQueryResult<ProposalPostAndCommentsQuery>>
		| Promise<ApolloQueryResult<MotionPostAndCommentsQuery>>
		| Promise<ApolloQueryResult<TipPostAndCommentsQuery>>
		| Promise<ApolloQueryResult<TreasuryProposalPostAndCommentsQuery>>
		| Promise<ApolloQueryResult<DiscussionPostAndCommentsQuery>>
	toggleEdit: () => void
}

const EditablePostContent = ({ className, isEditing, isTipProposal, onchainId, post, postStatus, refetch, toggleEdit }: Props) => {
	const [showModal, setShowModal] = useState(false);
	const { author, content, title } = post;
	const [newContent, setNewContent] = useState(content || '');
	const [newTitle, setNewTitle] = useState(title || '');
	const { queueNotification } = useContext(NotificationContext);
	const { control, errors, handleSubmit, setValue } = useForm();
	const [linkPostId, setLinkPostId] = useState('');
	const [validationError, setValidationError] = useState('');

	const handleCancel = () => {
		toggleEdit();
		setNewContent(content || '');
		setNewTitle(title || '');
	};
	const handleSave = () => {
		toggleEdit();
		editPostMutation( {
			variables: {
				content: newContent,
				id: post.id,
				title: newTitle
			} }
		)
			.then(({ data }) => {
				if (data && data.update_posts && data.update_posts.affected_rows > 0){
					queueNotification({
						header: 'Success!',
						message: 'Your post was edited',
						status: NotificationStatus.SUCCESS
					});
					refetch();
				}
			})
			.catch((e) => console.error('Error saving post',e));
	};

	const onTitleChange = (event: React.ChangeEvent<HTMLInputElement>[]) => {setNewTitle(event[0].currentTarget.value); return event[0].currentTarget.value;};
	const onContentChange = (data: Array<string>) => {setNewContent(data[0]); return data[0].length ? data[0] : null;};
	const [editPostMutation, { error }] = useEditPostMutation({
		variables: {
			content: newContent,
			id: post.id,
			title: newTitle
		}
	});

	const [discussionPostQuery, { data, loading }] = useDiscussionPostAndCommentsLazyQuery();

	const handleLink = () => {
		if (!linkPostId) {
			setValidationError('Please enter a valid post id');
		}

		if (isNaN(Number(linkPostId))) {
			setValidationError('Please enter a valid post id number');
		}

		try {
			discussionPostQuery({ variables: { id: Number(linkPostId) } });

			if (data && data.posts && data.posts.length) {
				if (data.posts[0].title) {
					setValue('title', data.posts[0].title);
					setNewTitle(data.posts[0].title);
				}
				if  (data.posts[0].content) {
					setValue('content', data.posts[0].content);
					setNewContent(data.posts[0].content);
				}
			}
		} catch (error) {
			setValidationError(error.message);
		}

		dismissModal();
	};

	const openModal = () => {
		setShowModal(true);
	};

	const dismissModal = () => {
		setShowModal(false);
	};

	const onLinkPostIdChange = (event: React.FormEvent<HTMLInputElement>, data: InputOnChangeData) => {
		setLinkPostId(data.value?.toString() || '');
	};

	useEffect(() => {
		if (isEditing) {
			setValue('content',content);
			setValue('title',title);
		}
	},[content, isEditing, setValue, title]);

	useEffect(() => {
		if (data && data.posts && data.posts.length) {
			if (data.posts[0].title) {
				setValue('title', data.posts[0].title);
				setNewTitle(data.posts[0].title);
			}
			if  (data.posts[0].content) {
				setValue('content', data.posts[0].content);
				setNewContent(data.posts[0].content);
			}
		}
	}, [data, setValue]);

	if (!author || !author.username || !content) return <div>Post content or author could not be found.</div>;

	return (
		<>
			{showModal ?
				<Modal
					buttons={
						<Form.Group>
							<Button
								content='Link'
								icon='chain'
								primary
								disabled={loading}
								onClick={handleLink}
							/>
							<Button
								content='Close'
								icon='close'
								secondary
								onClick={dismissModal}
							/>
						</Form.Group>
					}
					centered
					dimmer='inverted'
					open
					onClose={dismissModal}
					size='tiny'
					title={'Post Id to link'}
				>
					<Form standalone={false}>
						<Form.Group>
							<Form.Field width={16}>
								<Input
									name={'linkPostId'}
									placeholder={'Post Id'}
									onChange={onLinkPostIdChange}
									value={linkPostId || ''}
								/>
							</Form.Field>
						</Form.Group>
						{loading && <Loader text={'fetching...'}/>}
						{error?.message && <FilteredError text={error.message}/>}
						{validationError && <FilteredError text={validationError}/>}
					</Form>
				</Modal>
				: null
			}
			<div className={className}>
				{error?.message && <FilteredError text={error.message}/>}
				{
					isEditing
						?
						<Form standalone={false}>
							<Controller
								as={<TitleForm
									errorTitle={errors.title}
								/>}
								control={control}
								name='title'
								onChange={onTitleChange}
								rules={{ required: true }}
							/>
							<Controller
								as={<ContentForm
									errorContent={errors.content}
								/>}
								name='content'
								control={control}
								onChange={onContentChange}
								rules={{ required: true }}
							/>
							<div className='button-container'>
								<Button secondary size='small' onClick={openModal}><GoLink className='icon'/>Link Post</Button>
								<span>
									<Button secondary size='small' onClick={handleCancel}><GoX className='icon'/>Cancel</Button>
									<Button primary size='small' onClick={handleSubmit(handleSave)}><GoCheck className='icon'/>Save</Button>
								</span>
							</div>
						</Form>
						:
						<>
							<PostContent isTipProposal={isTipProposal} onchainId={onchainId} post={post} postStatus={postStatus}/>
						</>
				}
			</div>
		</>
	);
};

export default styled(EditablePostContent)`
	margin-bottom: 2rem;

	.button-container {
		width: 100%;
		display: flex;
		justify-content: space-between;
	}
`;
