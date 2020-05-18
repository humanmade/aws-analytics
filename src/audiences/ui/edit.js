import React, { Component } from 'react';
import styled from 'styled-components';

import AudienceEditor from './components/audience-editor';
import Estimate from './components/estimate';
import { defaultPost, defaultAudience } from './data/defaults';

const { compose } = wp.compose;
const {
	withSelect,
	withDispatch,
} = wp.data;
const { __ } = wp.i18n;
const {
	Button,
	ToggleControl,
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
			createPost,
			updatePost,
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
			updatePost( post );
		} else {
			createPost( post );
		}
	}

	render() {
		const {
			canEdit,
			loading,
			saving,
			post,
			setTitle,
			setAudience,
			setStatus,
		} = this.props;

		const {
			error,
			notice,
		} = this.state;

		// Check permissions.
		if ( post && post.id && canEdit( post.id ) === false ) {
			return (
				<Notice status="error">
					{ __( 'You do not have permission to edit this audience.' ) }
				</Notice>
			);
		}

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
						value={ post.title.rendered }
						onChange={ e => setTitle( e.target.value ) }
					/>
				</div>

				<div className="audience-settings">
					<AudienceEditor
						audience={ post.audience || defaultAudience }
						onChange={ setAudience }
					/>

					<div className="audience-options">
						<Estimate
							audience={ post.audience }
							title={ __( 'Audience size', 'altis-analytics' ) }
							sparkline
						/>
						<h3>{ __( 'Audience options', 'altis-analytics' ) }</h3>
						<ToggleControl
							checked={ post.status === 'publish' }
							disabled={ loading }
							help={ post.status === 'publish' ? __( 'Audience is active', 'altis-analytics' ) : __( 'Audience is inactive', 'altis-analytics' ) }
							label={ __( 'Active', 'altis-analytics' ) }
							onChange={ () => setStatus( post.status === 'publish' ? 'draft' : 'publish' ) }
						/>
						<input
							name="post_status"
							type="hidden"
							value={ post.status }
						/>
						<Button
							disabled={ loading || saving }
							isLarge
							isPrimary
							type="submit"
							onClick={ this.onSubmit }
						>
							{ post.status === 'publish' && ! post.id && __( 'Publish' ) }
							{ post.status !== 'publish' && ! post.id && __( 'Save Draft' ) }
							{ post.id && __( 'Update' ) }
							{ saving && <Spinner /> }
						</Button>
					</div>
				</div>
			</StyledEdit>
		);
	}
}

Edit.defaultProps = {
	postId: null,
	post: defaultPost,
	loading: false,
	saving: false,
	setTitle: () => { },
	setAudience: () => { },
	setStatus: () => { },
	savePost: () => { },
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

	return {
		canCreate,
		canEdit: id => canUser( 'update', 'audiences', id ),
		post,
		loading,
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
		setTitle: value => updateCurrentPost( {
			title: {
				rendered: value,
				raw: value,
			},
		} ),
		setAudience: value => updateCurrentPost( { audience: value } ),
		setStatus: value => updateCurrentPost( { status: value } ),
		updatePost,
		createPost,
	};
} );

export default compose(
	applyWithDispatch,
	applyWithSelect,
)( Edit );
