import React, { Component, createRef } from 'react';
import styled from 'styled-components';
import Edit from './edit';
import List from './list';
import { defaultPost } from './data/defaults';

const { withDispatch } = wp.data;
const { Button } = wp.components;
const { compose } = wp.compose;
const { __ } = wp.i18n;

const StyledManager = styled.div`
	.wp-heading-inline {
		display: inline-block;
	}
	&& .page-title-action {
		margin-left: 10px;
	}
	.wp-header-end {
		margin-bottom: 14px;
	}
`;

class Manager extends Component {

	state = {
		// Current view.
		view: 'list',
	};

	constructor() {
		super();

		this.actionRef = createRef();
	}

	render() {
		const {
			createPost,
			setCurrentPost,
			onSelect,
		} = this.props;
		const { view } = this.state;

		const states = {
			list: {
				title: __( 'Audiences', 'altis-analytics' ),
				action: {
					label: __( 'Add New', 'atlis-analytics' ),
					onClick: () => {
						setCurrentPost( defaultPost );
						createPost();
						this.setState( { view: 'edit' } );
					},
				},
				body: () => (
					<List
						onSelect={ onSelect }
						onEdit={ post => {
							setCurrentPost( post );
							this.setState( { view: 'edit' } );
						} }
					/>
				),
			},
			edit: {
				title: __( 'Edit Audience', 'altis-analytics' ),
				action: {
					label: __( 'Back to Audiences', 'atlis-analytics' ),
					onClick: () => this.setState( { view: 'list' } ),
				},
				body: () => <Edit />,
			},
		};

		const viewState = states[ view ];

		const Body = viewState.body;

		return (
			<StyledManager className="altis-audience-manager">
				<header className="altis-audience-manager__header">
					<h1 className="wp-heading-inline">{ viewState.title }</h1>
					<Button
						ref={ this.actionRef }
						className="page-title-action"
						onClick={ () => {
							viewState.action.onClick();
							this.actionRef.current.blur();
						} }
						isPrimary
					>
						{ viewState.action.label }
					</Button>
					<hr className="wp-header-end" />
				</header>
				<Body />
			</StyledManager>
		);
	}

}

Manager.defaultProps = {
	onSelect: null,
};

const applyWithDiapatch = withDispatch( dispatch => {
	const {
		createPost,
		setCurrentPost,
	} = dispatch( 'audience' );

	return {
		createPost,
		setCurrentPost,
	};
} );

export default compose(
	applyWithDiapatch
)( Manager );
