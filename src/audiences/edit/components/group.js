import styled from 'styled-components';

const Group = styled.div.attrs( () => ( {
	className: "audience-editor__group",
} ) )`
	background: rgba(0, 0, 0, 0.02);
	border-radius: 3px;
	border: 1px solid rgba(0, 0, 0, .1);
	padding: 20px;
	margin: 0 0 20px;

	.audience-editor__group-header {
		margin: 0 0 15px;
		display: flex;
		align-items: baseline;
	}

	h3 {
		margin: 0 20px 0 0;
		text-transform: lowercase;
		font-variant: small-caps;
	}

	> .components-button {
		margin-right: 10px;
	}
`;

export default Group;
