import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import AudienceEditor from './components/audience-editor';
import Options from './components/options';
import {
	defaultAudience,
} from './data/defaults';
import {
	getAudience,
	getFields,
} from './data';

// Check for standard post edit page options meta box.
const AudienceOptionsUI = document.getElementById( 'altis-analytics-audience-options' );

class Edit extends Component {
	constructor( props ) {
		super( props );

		this.state = {
			post: null,
			audience: defaultAudience,
			fields: [],
			loading: true,
		};
	}

	componentDidMount() {
		// Fetch fields.
		this.setFields();
		// Fetch the post.
		this.setAudience();
	}

	async setFields() {
		try {
			const fields = await getFields();
			this.setState( { fields } );
		} catch ( error ) {
			this.setState( {
				error,
				loading: false,
			} );
		}
	}

	async setAudience() {
		try {
			const post = await getAudience( this.props.postId );
			this.setState( {
				post,
				audience: post.audience,
				loading: false,
			} );
		} catch ( error ) {
			this.setState( {
				error,
				loading: false,
			} );
		}
	}

	render() {
		const { audience, fields, error } = this.state;

		return (
			<div className="audience-ui">
				{ error && (
					<div className="error msg">
						<p>{ error.message }</p>
					</div>
				) }

				{ /* A portal is used here to support the legacy post edit screen publish meta boxes and to
				pass the actively edited audience through to the Options */ }
				{ AudienceOptionsUI && ReactDOM.createPortal(
					<Options
						audience={ audience }
						postId={ this.props.postId }
					/>,
					AudienceOptionsUI
				) }

				<AudienceEditor
					audience={ audience }
					fields={ fields }
					onChange={ value => this.setState( { audience: value } ) }
				/>
			</div>
		);
	}
};

export default Edit;
