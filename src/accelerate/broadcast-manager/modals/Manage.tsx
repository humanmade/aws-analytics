import { Modal, Button, ButtonGroup, TextControl } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

import { Post, trackEvent } from '../../../util';
import BlockSelector from '../../components/BlockSelector';
import { usePost } from '../../../data/hooks';

type Props = {
	listId: string,
	item: Post,
	onClose(): void,
	onSuccess( id: number ): void,
};

/**
 * Create a Broadcast modal component.
 *
 * @param props Props
 * @returns {React.element}
 */
export default function ManageModal ( props: Props ) {
	const {
		listId,
		item,
		onClose,
		onSuccess,
	} = props;

	const { post, onUpdatePost, isUpdating } = usePost( item.id );

	const [ title, setTitle ] = useState<string>( item.title );
	const [ blocks, setBlocks ] = useState<number[]>( item.blocks || [] );

	const onSave = async function ( e: React.FormEvent ) {
		e.preventDefault();
		trackEvent( listId, 'Action', { action: 'update', type: post.type, blocks: blocks.length } );

		await onUpdatePost( {
			id: post.id,
			type: post.type.name,
			title,
			blocks,
		} );

		onSuccess( post.id );
	};

	return (
		<Modal
			title={ sprintf( __( 'Manage Broadcast blocks for: %s', 'altis' ), title ) }
			onRequestClose={ onClose }
			style={ { maxWidth: '600px' } }
		>
			<form onSubmit={ onSave }>
				<TextControl
					label={ __( 'Broadcast name:', 'altis' ) }
					onChange={ setTitle }
					value={ title }
					autoFocus
					disabled={ isUpdating }
				/>

				<BlockSelector
					label={ __( 'Select nested blocks', 'altis' ) }
					value={ blocks }
					onChange={ setBlocks }
				/>

				<ButtonGroup>
					<Button isPrimary disabled={ isUpdating } onClick={ onSave }>
						{ isUpdating ? __( 'Updating..', 'altis' ) : __( 'Update', 'altis' ) }
					</Button>
					<Button isSecondary disabled={ isUpdating } onClick={ onClose }>
						{ __( 'Cancel', 'altis' ) }
					</Button>
				</ButtonGroup>
			</form>
		</Modal>
	);
}