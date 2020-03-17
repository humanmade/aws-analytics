import React, { Component } from 'react';
import styled from 'styled-components';

import Estimate from './estimate';

import { getAudience } from '../data';

const { Button, ToggleControl } = wp.components;
const { __ } = wp.i18n;

const StyledOptions = styled.div.attrs( () => ( {
	className: 'audience-options',
} ) )`
	.audience-estimate {
		margin: 0 0 30px;
	}
`;

class Options extends Component {
	constructor( props ) {
		super( props );

		this.state = {
			post: null, // The current post object if known.
			title: '', // The current post title.
			error: null, // Any error thrown / set manually.
			active: false, // If true audience is 'published', else 'draft'.
			checks: {}, // Any pre submit checks are stored here.
		};

		// Bind component to DOM event listeners.
		this.onChangeTitle = this.onChangeTitle.bind( this );
		this.onSubmit = this.onSubmit.bind( this );
	}

	async componentDidMount() {
		// Get the form element if there is one.
		this.formElement = document.getElementById( 'post' );
		if ( this.formElement ) {
			this.formElement.addEventListener( 'submit', this.onSubmit );
		}

		// Get the title element for the edit screen if there is one.
		this.titleField = document.getElementById( 'title' );
		if ( this.titleField ) {
			this.titleField.addEventListener( 'keyup', this.onChangeTitle );
		}

		// Fetch the post.
		if ( this.props.postId ) {
			try {
				const post = await getAudience( this.props.postId );
				this.setState( {
					active: post.status === 'publish',
					post,
					title: post.title.raw,
					canSave: post.title.raw.length > 0
				} );
			} catch ( error ) {
				this.setState( { error } );
			}
		} else {
			this.setState( {
				error: {
					message: __( 'Unable to determine current audience ID', 'altis-analytics' ),
				},
			} );
		}
	}

	componentWillUnmount() {
		if ( this.titleField ) {
			this.titleField.removeEventListener( this.onChangeTitle );
			this.titleField = null;
		}
		if ( this.formElement ) {
			this.formElement.removeEventListener( this.onSubmit );
			this.formElement = null;
		}
	}

	onSubmit( event ) {
		const checks = this.doPreSaveChecks();
		if ( Object.values( checks ).length > 0 ) {
			event.preventDefault();
		} else {
			// Prevent the "Leave site?" warning popup showing.
			window.onbeforeunload = null;
			window.jQuery && window.jQuery( window ).off( 'beforeunload' );
		}
		this.setState( { checks } );
	}

	onChangeTitle( event ) {
		this.setState( { title: event.target.value } );
	}

	doPreSaveChecks() {
		let checks = this.state.checks;

		// Check for empty title.
		if ( this.state.title.length === 0 ) {
			checks['title_empty'] = __( 'The title cannot be empty', 'altis-analytics' );
		} else {
			delete checks['title_empty'];
		}

		// Update checks if any have been added or removed.
		return checks;
	}

	static getDerivedStateFromError( error ) {
		return { error };
	}

	componentDidCatch( error, errorInfo ) {
		console.error( error, errorInfo );
	}

	render() {
		const {
			audience,
		} = this.props;
		const {
			post,
			error,
			active,
			checks,
		} = this.state;

		if ( error ) {
			return (
				<div className="error msg">
					<p>{ error.message || __( 'There was an error loading the audience data.', 'altis-analytics' ) }</p>
				</div>
			);
		}

		return (
			<StyledOptions>
				<Estimate audience={ audience || post.audience } />
				<ToggleControl
					label={ __( 'Active', 'altis-analytics' ) }
					help={ active ? __( 'Audience is active', 'altis-analytics' ) : __( 'Audience is inactive', 'altis-analytics' ) }
					checked={ active }
					onChange={ () => this.setState( state => ( { active: ! state.active } ) ) }
				/>
				<input type="hidden" name="post_status" value={ active ? 'publish' : 'draft' } />
				{ Object.values( checks ).length > 0 && (
					<div className="audience-options__checks">
						{ Object.values( checks ).map( check => <div className="error msg"><p>{ check }</p></div> ) }
					</div>
				) }
				<Button
					isLarge
					isPrimary
					type="submit"
					onClick={ e => {
						if ( ! this.formElement ) {
							this.onSubmit( e );
						}
					} }
				>
					{ __( 'Save changes', 'altis-analytics' ) }
				</Button>
			</StyledOptions>
		);
	}
};

export default Options;
