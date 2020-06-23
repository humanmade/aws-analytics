import React, { Component, Fragment } from 'react';
import styled from 'styled-components';

import AudienceEditor from './components/audience-editor';
import Estimate from './components/estimate';
import StatusToggle from './components/status-toggle';
import { defaultPost, defaultAudience } from './data/defaults';

const { compose } = wp.compose;
const {
	withSelect,
	withDispatch,
} = wp.data;
const { decodeEntities } = wp.htmlEntities;
const { __ } = wp.i18n;
const {
	Button,
	Notice,
	Spinner,
} = wp.components;

const StyledEdit = styled.div`
	margin: 20px 0;

	.components-notice {
		margin: 0 0 20px;
	}

	.audience-settings {
		display: flex;
	}

	.audience-settings > * {
		flex: 1;
	}

	.audience-options {
		flex: 0 1 320px;
		margin: 20px 0 20px 40px;
	}

	.audience-estimate {
		margin-bottom: 40px;
	}
`;

class Edit extends Component {
	state = {
		notice: null,
		error: null,
	};

	static getDerivedStateFromError( error ) {
		return { error };
	}

	componentDidCatch( error, errorInfo ) {
		console.error( error, errorInfo );
	}

	onSubmit = event => {
		// Clear errors.
		this.setState( { error: null } );

		const {
			post,
			onCreatePost,
			onUpdatePost,
		} = this.props;

		if ( post && post.title.rendered.length === 0 ) {
			event.preventDefault();
			this.setState( {
				error: __( 'The title cannot be empty', 'altis-analytics' ),
			} );
			return;
		}

		// Update if we have an ID, otherwise create a new one.
		if ( post.id ) {
			onUpdatePost( post );
		} else {
			onCreatePost( post );
		}
	}

	render() {
		const {
			canCreate,
			canEdit,
			loading,
			post,
			saving,
			onSelect,
			onSetAudience,
			onSetTitle,
			onSetStatus,
		} = this.props;

		const {
			error,
			notice,
		} = this.state;

		// Check for REST API errors.
		if ( post && post.error && post.error.message ) {
			return (
				<Notice status="error">
					{ post.error.message }
				</Notice>
			);
		}

		// Check status is valid.
		if ( post && post.status === 'trash' ) {
			return (
				<Notice status="error">
					{ __( 'This audience has been deleted.', 'altis-analytics' ) }
				</Notice>
			);
		}

		// Check permission for editing.
		if ( post && post.id && canEdit === false ) {
			return (
				<Notice status="error">
					{ __( 'You do not have permission to edit this audience.', 'altis-analytics' ) }
				</Notice>
			);
		}

		// Check permission for creating.
		if ( post && ! post.id && canCreate === false ) {
			return (
				<Notice status="error">
					{ __( 'You do not have permission to create new audiences.', 'altis-analytics' ) }
				</Notice>
			);
		}

		const isPublished = post && post.status === 'publish';

		return (
			<StyledEdit className={ `audience-ui ${ loading ? 'audience-ui--loading' : '' }` }>
				{ error && (
					<Notice
						isDismissable
						status="error"
						onRemove={ () => this.setState( { error: null } ) }
					>
						{ error.toString() }
					</Notice>
				) }
				{ notice && (
					<Notice
						isDismissable
						status="success"
						onRemove={ () => this.setState( { notice: null } ) }
					>
						{ notice }
					</Notice>
				) }

				<div id="titlediv">
					<input
						autoFocus
						disabled={ loading }
						id="title"
						name="post_title"
						placeholder={ __( 'Add title', 'altis-analytics' ) }
						type="text"
						value={ decodeEntities( post.title.rendered ) }
						onChange={ event => onSetTitle( event.target.value ) }
					/>
				</div>

				<div className="audience-settings">
					<AudienceEditor
						audience={ post.audience || defaultAudience }
						onChange={ onSetAudience }
					/>

					<div className="audience-options">
						<Estimate
							audience={ post.audience }
							sparkline
							title={ __( 'Audience size', 'altis-analytics' ) }
						/>
						<h3>{ __( 'Audience options', 'altis-analytics' ) }</h3>
						<StatusToggle
							disabled={ loading }
							status={ post.status }
							onChange={ () => onSetStatus( isPublished ? 'draft' : 'publish' ) }
						/>
						<Button
							disabled={ loading || saving }
							isLarge
							isPrimary
							type="submit"
							onClick={ this.onSubmit }
						>
							{ isPublished && ! post.id && __( 'Publish' ) }
							{ ! isPublished && ! post.id && __( 'Save Draft' ) }
							{ post.id && __( 'Update' ) }
							{ saving && <Spinner /> }
						</Button>
						{ post.id && onSelect && (
							<Fragment>
								{ ' ' }
								<Button
									disabled={ ! isPublished }
									isLarge
									onClick={ () => onSelect( post ) }
								>
									{ __( 'Select', 'altis-experiments' ) }
								</Button>
							</Fragment>
						) }
					</div>
				</div>
			</StyledEdit>
		);
	}
}

Edit.defaultProps = {
	loading: false,
	post: defaultPost,
	postId: null,
	saving: false,
	onCreatePost: () => { },
	onSelect: null,
	onSetAudience: () => { },
	onSetStatus: () => { },
	onSetTitle: () => { },
	onUpdatePost: () => { },
};

const applyWithSelect = withSelect( ( select, props ) => {
	const {
		getCurrentPost,
		getIsLoading,
		getIsUpdating,
	} = select( 'audience' );

	let post = getCurrentPost() || props.post;

	if ( props.postId ) {
		post = getCurrentPost( props.postId );
	}

	// If we have a post ID but no post then we're loading.
	const loading = getIsLoading();

	// Determine if we're currently saving the post.
	const saving = getIsUpdating();

	// Permissions check.
	const { canUser } = select( 'core' );
	const canCreate = canUser( 'create', 'audiences' );
	const canEdit = canUser( 'update', 'audiences', post.id || props.postId );

	return {
		canCreate,
		canEdit,
		loading,
		post,
		saving,
	};
} );

const applyWithDispatch = withDispatch( dispatch => {
	const {
		createPost,
		updateCurrentPost,
		updatePost,
	} = dispatch( 'audience' );

	return {
		onCreatePost: post => createPost( post ),
		onSetAudience: value => updateCurrentPost( { audience: value } ),
		onSetTitle: value => updateCurrentPost( {
			title: {
				rendered: value,
				raw: value,
			},
		} ),
		onSetStatus: value => updateCurrentPost( { status: value } ),
		onUpdatePost: post => updatePost( post ),
	};
} );

export default compose(
	applyWithDispatch,
	applyWithSelect,
)( Edit );
