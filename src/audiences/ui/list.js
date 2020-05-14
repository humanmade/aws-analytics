import React, { Component, Fragment } from 'react';
import styled, { css } from 'styled-components';
import ListRowLoading from './components/list-row-loading';
import Estimate from './components/estimate';

const { compose } = wp.compose;
const {
	withSelect,
	withDispatch,
} = wp.data;
const { __, sprintf } = wp.i18n;
const {
	Button,
	IconButton,
	ToggleControl,
} = wp.components;

const ActionLink = ( {
	post,
	label,
	children = null,
	className = '',
	onClick,
} ) => (
	<Button
		isLink
		className={ className }
		onClick={ event => {
			event.preventDefault();
			onClick( post );
		} }
		aria-label={ sprintf( label, post.title.rendered ) }
	>
		{ children || post.title.rendered }
	</Button>
);

const selectModeCSS = css`
	tbody tr:hover {
		cursor: pointer;
		background-color: rgba(70, 103, 222, .2);
	}
`;

const AudienceList = styled.div`
	.column-order {
		width: 3rem;
	}
	.column-active {
		width: 14rem;
	}
	.column-select {
		width: 5rem;
	}
	& .audience-estimate__percentage {
		max-width: 4rem;
	}
	button.is-link,
	button.is-link:hover {
		text-decoration: none;
	}
	button.is-link:focus,
	button.is-link:active {
		border: 0;
		background: none;
	}

	${ props => props.selectMode && selectModeCSS }
`;

const AudienceSort = styled.span`
	display: flex;
	flex-direction: row;
	align-items: center;

	.audience-sort-order {
		&__number {
			font-weight: bold;
			flex: 1;
		}
		&__controls {
			flex: 1;
			button {
				padding: 3px;
			}
		}
		&__up {
			margin-bottom: 2px;
		}
	}
`;

class List extends Component {

	state = {
		page: 1,
		search: '',
	};

	render() {
		const {
			posts = [],
			onEdit,
			onSelect,
			deletePost,
			updatePost,
			loading,
		} = this.props;

		const EditLink = props => (
			<ActionLink
				label={ __( 'Edit “%s”' ) }
				onClick={ onEdit }
				{ ...props }
			/>
		);

		const TrashLink = props => (
			<ActionLink
				label={ __( 'Move “%s” to the Trash' ) }
				className="is-destructive"
				onClick={ post => deletePost( post.id ) }
				{ ...props }
			/>
		);

		const ColumnHeadings = () => (
			<tr>
				<th scope="col" className="manage-column column-order">
					{ __( 'Order', 'altis-analytics' ) }
				</th>
				<th scope="col" className="manage-column column-title column-primary">
					{ __( 'Title', 'altis-analytics' ) }
				</th>
				<th scope="col" className="manage-column column-active">
					{ __( 'Status', 'altis-analytics' ) }
				</th>
				<th scope="col" className="manage-column column-estimate">
					{ __( 'Size', 'altis-analytics' ) }
				</th>
				{ posts && posts.length > 0 && onSelect && (
					<th scope="col" className="manage-column column-select">&nbsp;</th>
				) }
			</tr>
		);

		return (
			<AudienceList className="altis-audience-listing" selectMode={ !! onSelect }>
				<table className="wp-list-table widefat fixed striped posts">
					<thead>
						<ColumnHeadings />
					</thead>
					<tbody>
						{ posts.length > 0 && posts.map( ( post, index ) => (
							<tr
								key={ post.id }
								onClick={ event => {
									// Check a few levels up if we should bail.
									let el = event.target;
									let depth = 0;
									do {
										if ( [ 'A', 'INPUT', 'BUTTON' ].indexOf( el.nodeName ) >= 0 ) {
											return;
										}
										el = el.parentNode;
									} while ( depth++ < 4 );

									event.stopPropagation();

									// Trigger on select behaviour if we're in select mode.
									onSelect && onSelect( post );
								} }
							>
								<td>
									<AudienceSort className="audience-sort-order">
										<span className="audience-sort-order__number">{ index + 1 }</span>
										<span className="audience-sort-order__controls">
											<IconButton
												className="audience-sort-order__up"
												icon="arrow-up-alt2"
												label={ __( 'Move up', 'altis-analytics' ) }
												disabled={ ! posts[ index - 1 ] }
												onClick={ () => {
													updatePost( {
														id: post.id,
														menu_order: post.menu_order - 1,
													} );
													updatePost( {
														id: posts[ index - 1 ].id,
														menu_order: post.menu_order,
													} );
												} }
											/>
											<IconButton
												className="audience-sort-order__down"
												icon="arrow-down-alt2"
												label={ __( 'Move down', 'altis-analytics' ) }
												disabled={ ! posts[ index + 1 ] }
												onClick={ () => {
													updatePost( {
														id: post.id,
														menu_order: post.menu_order + 1,
													} );
													updatePost( {
														id: posts[ index + 1 ].id,
														menu_order: post.menu_order,
													} );
												} }
											/>
										</span>
									</AudienceSort>
								</td>
								<td>
									<EditLink className="row-title" post={ post }>
										<strong>{ post.title.rendered }</strong>
									</EditLink>
									<div className="row-actions">
										<span className="edit">
											<EditLink post={ post }>
												{ __( 'Edit' ) }
											</EditLink>
										</span>
										{ ' | ' }
										<span className="trash">
											<TrashLink post={ post }>
												{ __( 'Trash' ) }
											</TrashLink>
										</span>
									</div>
								</td>
								<td>
									<ToggleControl
										checked={ post.status === 'publish' }
										help={ post.status === 'publish' ? __( 'Audience is active', 'altis-analytics' ) : __( 'Audience is inactive', 'altis-analytics' ) }
										label={ __( 'Active', 'altis-analytics' ) }
										onChange={ () => updatePost( {
											id: post.id,
											status: post.status === 'publish' ? 'draft' : 'publish',
										} ) }
									/>
								</td>
								<td>
									<Estimate audience={ post.audience } horizontal />
								</td>
								{ onSelect && (
									<td>
										<Button
											className="button"
											onClick={ () => onSelect( post ) }
										>
											{ __( 'Select', 'altis-analytics' ) }
										</Button>
									</td>
								) }
							</tr>
						) ) }
						{ loading && (
							<Fragment>
								<ListRowLoading />
								<ListRowLoading />
								<ListRowLoading />
							</Fragment>
						) }
					</tbody>
					<tfoot>
						<ColumnHeadings />
					</tfoot>
				</table>
			</AudienceList>
		);
	}

}

const applyWithSelect = withSelect( select => {
	const { getPosts, getIsLoading } = select( 'audience' );
	const posts = getPosts();
	const loading = getIsLoading();

	return {
		getPosts,
		posts,
		loading,
	};
} );

const applyWithDispatch = withDispatch( dispatch => {
	const {
		deletePost,
		updatePost,
	} = dispatch( 'audience' );

	return {
		deletePost: id => {
			if ( window.confirm( __( 'Are you sure you want to permanently delete this audience?', 'altis-analytics' ) ) ) {
				deletePost( id );
			}
		},
		updatePost,
	};
} );

export default compose(
	applyWithSelect,
	applyWithDispatch
)( List );
