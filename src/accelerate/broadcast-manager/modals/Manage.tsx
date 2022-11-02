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
	} = props;

	const { post, onUpdatePost, isUpdating } = usePost( item.id );
	const [ blocks, setBlocks ] = useState<number[]>( item.blocks || [] );

	const onSave = async function ( blocks: number[] ) {
		setBlocks( blocks );
		trackEvent( listId, 'Action', { action: 'update', type: post.type, blocks: blocks.length } );

		await onUpdatePost( {
			id: post.id,
			type: post.type.name,
			blocks,
		} );
	};

	return (
		<Modal
			title={ sprintf( __( 'Manage Broadcast blocks for: %s', 'altis' ), item.title ) }
			onRequestClose={ onClose }
			style={ { maxWidth: '600px' } }
		>
			<BlockSelector
				label={ __( 'Select nested blocks', 'altis' ) }
				value={ blocks }
				onChange={ onSave }
			/>
		</Modal>
	);
}