import { Modal, Button, ButtonGroup, TextControl, Notice } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Post, trackEvent } from '../../../util';
import { useDispatch, useSelect } from '@wordpress/data';

type Props = {
	listId: string,
	item?: Post|null,
	onClose(): void,
	onSuccess( id: number ): void,
};

/**
 * Create a Broadcast modal component.
 *
 * @param props Props
 * @returns {React.element}
 */
export default function CreateUpdateModal ( props: Props ) {
	const {
		listId,
		item,
		onClose,
		onSuccess,
	} = props;

	const { createPost, updatePost } = useDispatch( 'accelerate' );
	const isSaving: boolean = useSelect( select => select( 'accelerate' ).getIsUpdating<boolean>() );
	const [ title, setTitle ] = useState<string>( item ? item.title : '' );

	const onSave = async function ( e: React.FormEvent ) {
		e.preventDefault();
		let post: Post;

		if ( item ) {
			post = await updatePost( { id: item.id, title, type: 'broadcast' } );
			trackEvent( listId, 'Action', { action: 'rename', type: 'broadcast' } );
		} else {
			post = await createPost( { title, type: 'broadcast', status: 'publish' } );
			trackEvent( listId, 'Action', { action: 'create', type: 'broadcast' } );
		}

		onSuccess( post.id );
		onClose();
	};

	return (
		<Modal
			title={ item ? __( 'Update Broadcast', 'altis' ) : __( 'Create a new Broadcast', 'altis' ) }
			onRequestClose={ onClose }
			style={ { maxWidth: '600px' } }
		>
			<form onSubmit={ onSave }>
				<TextControl
					label={ __( 'Choose a name for the Broadcast:', 'altis' ) }
					onChange={ setTitle }
					value={ title }
					autoFocus
					disabled={ isSaving }
				/>

				<ButtonGroup>
					<Button isPrimary disabled={ isSaving } onClick={ onSave }>
						{ item
							? isSaving ? __( 'Updating…', 'altis' ) : __( 'Update', 'altis' )
							: isSaving ? __( 'Creating…', 'altis' ) : __( 'Create', 'altis' )
						}
						{  }
					</Button>
					<Button isSecondary disabled={ isSaving } onClick={ onClose }>
						{ __( 'Cancel', 'altis' ) }
					</Button>
				</ButtonGroup>
			</form>
		</Modal>
	);
}