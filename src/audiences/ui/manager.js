import React, { Component, createRef } from 'react';
import styled from 'styled-components';
import Edit from './edit';
import List from './list';
import { defaultPost } from './data/defaults';

const { withSelect, withDispatch } = wp.data;
const { Button } = wp.components;
const { compose } = wp.compose;
const { __ } = wp.i18n;

const StyledManager = styled.div`
	margin-right: 20px;

	.wp-heading-inline {
		display: inline-block;
		vertical-align: middle;
	}
	&& .page-title-action {
		margin-left: 10px;
	}
	.wp-header-end {
		margin-bottom: 14px;
	}
`;

class Manager extends Component {

	constructor( props ) {
		super( props );

		// Set default state.
		this.state = {
			view: 'list',
		};

		this.actionRef = createRef();
	}

	render() {
		const {
			canCreate,
			onSelect,
			onSetCurrentPost,
		} = this.props;
		const { view } = this.state;

		const states = {
			list: {
				title: __( 'Audiences', 'altis-analytics' ),
				action: {
					permission: canCreate,
					label: __( 'Add New', 'altis-analytics' ),
					onClick: () => {
						onSetCurrentPost( defaultPost );
						this.setState( { view: 'edit' } );
					},
				},
				body: () => (
					<List
						onSelect={ onSelect }
						onEdit={ post => {
							onSetCurrentPost( post || defaultPost );
							this.setState( { view: 'edit' } );
						} }
					/>
				),
			},
			edit: {
				title: __( 'Edit Audience', 'altis-analytics' ),
				action: {
					permission: true,
					label: __( 'Back to Audiences', 'altis-analytics' ),
					onClick: () => this.setState( { view: 'list' } ),
				},
				body: () => <Edit onSelect={ onSelect } />,
			},
		};

		const viewState = states[ view ];

		const Body = viewState.body;

		return (
			<StyledManager className="altis-audience-manager">
				<header className="altis-audience-manager__header">
					<h1 className="wp-heading-inline">{ viewState.title }</h1>
					{ viewState.action.permission && (
						<Button
							ref={ this.actionRef }
							className="page-title-action"
							isPrimary
							onClick={ () => {
								viewState.action.onClick();
								this.actionRef.current.blur();
							} }
						>
							{ viewState.action.label }
						</Button>
					) }
					<hr className="wp-header-end" />
				</header>
				<Body />
			</StyledManager>
		);
	}
}

Manager.defaultProps = {
	canCreate: false,
	onSelect: null,
};

const applyWithSelect = withSelect( select => {
	const { canUser } = select( 'core' );
	const canCreate = canUser( 'create', 'audiences' );

	return {
		canCreate,
	};
} );

const applyWithDispatch = withDispatch( dispatch => {
	const { setCurrentPost } = dispatch( 'audience' );

	return {
		onSetCurrentPost: setCurrentPost,
	};
} );

export default compose(
	applyWithSelect,
	applyWithDispatch
)( Manager );
