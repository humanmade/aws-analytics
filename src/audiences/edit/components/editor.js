import styled from 'styled-components';

const Editor = styled.div.attrs( () => ( {
	className: "audience-editor",
} ) )`
	margin: 0 0 40px;

	.audience-editor__include {
		margin: 20px 0;
	}
`;

export default Editor;
