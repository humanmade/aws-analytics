import React from 'react';
import ContentLoader from 'react-content-loader';

const ListRowLoading = () => (
	<tr>
		<td>
			<ContentLoader viewBox="0 0 16 8" width={ 16 } height={ 8 }>
				<rect x="0" y="0" rx="3" ry="3" width="16" height="8" />
			</ContentLoader>
		</td>
		<td>
			<ContentLoader viewBox="0 0 200 30" width={ 200 } height={ 30 }>
				<rect x="0" y="0" rx="3" ry="3" width="200" height="12" />
				<rect x="0" y="18" rx="3" ry="3" width="50" height="8" />
			</ContentLoader>
		</td>
		<td>
			<ContentLoader viewBox="0 0 100 10" width={ 100 } height={ 10 }>
				<rect x="0" y="1" rx="3" ry="3" width="18" height="8" />
				<rect x="24" y="1" rx="3" ry="3" width="60" height="8" />
			</ContentLoader>
		</td>
		<td>
			<ContentLoader viewBox="0 0 160 58" width={ 180 } height={ 58 }>
				<rect x="68" y="4" rx="3" ry="3" width="112" height="8" />
				<circle cx="29" cy="29" r="29" />
			</ContentLoader>
		</td>
	</tr>
);

export default ListRowLoading;
