import React, { useState } from 'react';
import { __ } from '@wordpress/i18n';

import List from '../components/List';
import { InitialData, Duration, Post } from '../../util';
import CreateUpdateModal from './modals/Create';
import ManageModal from './modals/Manage';

interface Props {
	postTypes: InitialData['postTypes'],
	user: InitialData[ 'user' ],
	id?: number,
}

export default function Broadcasts ( props: Props ) {
	const [ period, setPeriod ] = useState<Duration>( 'P7D' );
	const postTypes = props.postTypes.filter( type => type.name = 'broadcast' );
	const [ broadcastId, setBroadcastId ] = useState<number|null>( props?.id || null );
	const [ addingNewItem, setAddingNewItem ] = useState<boolean>( false );
	const [ managingItem, setManagingItem ] = useState<Post | null>( null );
	const [ renamingItem, setRenamingItem ] = useState<Post | null>( null );

	const actions = {
		[ __( 'Add/Remove blocks', 'altis' ) ]: ( post: Post ) => {
			setManagingItem( post );
		},
		[ __( 'Rename', 'altis' ) ]: ( post: Post ) => {
			setRenamingItem( post );
		}
	}

	return (
		<div className="Dashboard">
			<List
				listId="Broadcast Manager"
				searchPlaceholder={ __( 'Search Broadcasts', 'altis' ) }
				postTypes={ postTypes }
				postType={ postTypes[0] }
				currentUser={ props.user }
				period={ period }
				setPeriod={ setPeriod }
				filters={ [ 'all', 'mine' ] }
				onAddNewItem={ () => setAddingNewItem( true ) }
				onManageItem={ setManagingItem }
				actions={ actions }
				postId={ broadcastId }
			/>
			{ ( addingNewItem || renamingItem ) && (
				<CreateUpdateModal
					listId="Broadcast Manager"
					onClose={ () => addingNewItem ? setAddingNewItem( false ) : setRenamingItem( null ) }
					onSuccess={ id => setBroadcastId( id ) }
					item={ renamingItem }
				/>
			) }
			{ managingItem && (
				<ManageModal
					listId="Broadcast Manager"
					onClose={ () => setManagingItem( null ) }
					item={ managingItem }
				/>
			)}
		</div>
	)
}
