import { Modal, Button, ButtonGroup, TextControl, Notice } from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { Post, trackEvent } from '../../../util';
import { useDispatch, useSelect } from '@wordpress/data';

type Props = {
	listId: string,
	onClose(): void,
	onSuccess( id: number ): void,
};

/**
 * Create a Broadcast modal component.
 *
 * @param props Props
 * @returns {React.element}
 */
export default function CreateModal ( props: Props ) {
	const {
		listId,
		onClose,
		onSuccess,
	} = props;

	const { createPost } = useDispatch( 'accelerate' );
	const isSaving: boolean = useSelect( select => select( 'accelerate' ).getIsUpdating<boolean>() );
	const [ title, setTitle ] = useState<string>( '' );

	const onSave = async function ( e: React.FormEvent ) {
		e.preventDefault();

		const post: Post = await createPost( { title, type: 'broadcast', status: 'publish' } )
		trackEvent( listId, 'Action', { action: 'create', type: post.type } );

		onSuccess( post.id );
		onClose();
	};

	return (
		<Modal
			title={ __( 'Create a new Broadcast', 'altis' ) }
			onRequestClose={ onClose }
			style={ { maxWidth: '600px' } }
		>
			<form onSubmit={ onSave }>
				<TextControl
					label={ __( 'Choose a name for the new Broadcast:', 'altis' ) }
					onChange={ setTitle }
					value={ title }
					autoFocus
					disabled={ isSaving }
				/>

				<ButtonGroup>
					<Button isPrimary disabled={ isSaving } onClick={ onSave }>
						{ isSaving ? __( 'Creating…', 'altis' ) : __( 'Create', 'altis' ) }
					</Button>
					<Button isSecondary disabled={ isSaving } onClick={ onClose }>
						{ __( 'Cancel', 'altis' ) }
					</Button>
				</ButtonGroup>
			</form>
		</Modal>
	);
}