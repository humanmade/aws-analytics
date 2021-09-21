import React from 'react';
import styled from 'styled-components';

export { default as Duration } from './duration';
export { default as PanelRow } from './panel-row';
export { default as PluginIcon } from './plugin-icon';

const {
	Button: DefaultButton,
	Icon: DefaultIcon,
	Panel: DefaultPanel,
} = wp.components;

export const Button = DefaultButton;

export const Panel = styled( DefaultPanel )`
	.components-panel__body-title {
		.components-panel__icon {
			color: #adb4c1;
			align-self: flex-end;
			width: 16px;
			height: 16px;
			position: absolute;
			right: 45px;
			top: 1.1rem;
		}
	}
`;

export const Notice = styled.p`
	color: #6e7b92;
`;

export const Warning = styled( props => (
	<p { ...props }>
		<DefaultIcon icon="warning" />
		{ props.children }
	</p>
) ).attrs( {
	className: 'ab-tests__warning',
} )`
	&& {
		color: #d00115;
		font-style: italic;
		margin-top: 1em;
		display: inline-flex;

		.dashicon {
			width: 1rem;
			height: 1rem;
			margin-right: 7px;
			flex: 1 0 1rem;
		}
	}
`;

export const CenteredButton = styled( Button ).attrs( {
	isPrimary: true,
} )`
	text-align: center;
	width: 100%;
	display: block;
`;

export const DestructivedButton = styled( CenteredButton ).attrs( {
	isDestructive: true,
	isDefault: false,
	isPrimary: false,
} )`
	&.is-button {
		border-color: #e2182c;
		color: #e2182c;

		&:hover {
			background: #e2182c;
			border-color: #e2182c;
			color: #fff;
		}

		&:active:enabled {
			background: #d00115;
			border-color: #d00115;
			color: #fff;
		}
	}
`;

export const StyledResults = styled.div`
	margin: 25px 0;

	h3 {
		margin-bottom: 10px;
		font-weight: 500;
	}
`;

export const Variant = styled.div.attrs( props => ( {
	className: `altis-experiments-variant ${ props.highlight ? 'altis-experiments-variant--highlight' : '' }`,
} ) )`
	margin: 25px 0;
	position: relative;

	.altis-experiments-variant__change {
		color: ${ props => props.highlight ? '#25865b' : 'inherit' };
	}
`;

export const PercentageChange = styled.div.attrs( {
	className: 'altis-experiments-variant__change',
} )`
	position: absolute;
	top: 0;
	right: 0;
	font-size: 90%;
`;
