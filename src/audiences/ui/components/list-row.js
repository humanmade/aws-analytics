import React, { Fragment } from 'react';
import ActionLink from './action-link';
import AudienceSort from './audience-sort';
import Estimate from './estimate';
import StatusToggle from './status-toggle';
import {
	useCanEdit,
	useCanDelete,
	useDeletePost,
	useUpdatePost,
} from '../data/hooks';

const { Button } = wp.components;
const { __ } = wp.i18n;

const ListRow = props => {
	const {
		index,
		post,
		onSelect,
		canMoveUp,
		canMoveDown,
		onMoveUp,
		onMoveDown,
		onClick,
		onEdit,
	} = props;

	const isSelectMode = !! onSelect;
	const isPublished = post.status === 'publish';
	const canEdit = useCanEdit( post.id );
	const canDelete = useCanDelete( post.id );
	const deletePost = useDeletePost();
	const updatePost = useUpdatePost();

	const onDeletePost = () => {
		if ( window.confirm( __( 'Are you sure you want to delete this audience?', 'altis-anlaytics' ) ) ) {
			deletePost( post.id );
		}
	};

	const onStatusChange = () => updatePost( {
		id: post.id,
		status: post.status === 'publish' ? 'draft' : 'publish',
	} );

	const EditLink = props => (
		<ActionLink
			label={ __( 'Edit “%s”' ) }
			onClick={ onEdit }
			post={ post }
			{ ...props }
		/>
	);

	const TrashLink = props => (
		<ActionLink
			label={ __( 'Move “%s” to the Trash' ) }
			className="is-destructive"
			onClick={ onDeletePost }
			post={ post }
			{ ...props }
		/>
	);

	return (
		<tr
			className={ `audience-row audience-row--${ isPublished ? 'active' : 'inactive' }` }
			onClick={ onClick }
		>
			<td>
				<AudienceSort
					index={ index }
					onMoveUp={ onMoveUp }
					onMoveDown={ onMoveDown }
					canMoveUp={ canMoveUp }
					canMoveDown={ canMoveDown }
				/>
			</td>
			<td>
				{ ! canEdit && (
					<span className="row-title">
						<strong>{ post.title.rendered || __( '(no title)', 'altis-analytics' ) }</strong>
					</span>
				) }
				{ canEdit && (
					<EditLink className="row-title">
						<strong>{ post.title.rendered || __( '(no title)', 'altis-analytics' ) }</strong>
					</EditLink>
				) }
				<div className="row-actions">
					{ canEdit && (
						<span className="edit">
							<EditLink>
								{ __( 'Edit' ) }
							</EditLink>
						</span>
					) }
					{ canDelete && (
						<Fragment>
							{ ' | ' }
							<span className="trash">
								<TrashLink>
									{ __( 'Trash' ) }
								</TrashLink>
							</span>
						</Fragment>
					) }
				</div>
			</td>
			<td>
				<StatusToggle
					disabled={ ! canEdit }
					status={ post.status }
					onChange={ onStatusChange }
				/>
			</td>
			<td>
				<Estimate audience={ post.audience } horizontal />
			</td>
			{ isSelectMode && (
				<td>
					{ isPublished && (
						<Button
							className="button"
							onClick={ () => onSelect( post ) }
						>
							{ __( 'Select', 'altis-analytics' ) }
						</Button>
					) }
				</td>
			) }
		</tr>
	);
};

ListRow.defaultProps = {
	onClick: () => {},
};

export default ListRow;
