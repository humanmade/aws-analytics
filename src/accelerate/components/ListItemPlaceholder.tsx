import ContentLoader from 'react-content-loader';

type Props = {
	i: number,
};

let loaderProps = {
	speed: 2,
	foregroundColor: "#f5f6f8",
	backgroundColor: "#fff"
};

const ListItemPlaceholder = function ( props: Props ) {
	const {
		i,
	} = props;

	return (
		<tr key={ `placeholder-${i}` }>
			<td className="record-thumbnail">
				<ContentLoader
					{ ...loaderProps }
					width={ 105 }
					height={ 47 }
				>
					<rect x={ 0 } y={ 0 } rx="5" ry="5" width={ 105 } height={ 47 } />
				</ContentLoader>
			</td>
			<td className="record-name">
				<ContentLoader
					{ ...loaderProps }
					height={ 46 }
				>
					<rect x={ 0 } y={ 10 } rx="5" ry="5" width={ 50 } height={ 6 } />
					<rect x={ 0 } y={ 30 } rx="5" ry="5" width={ 100 } height={ 6 } />
				</ContentLoader>
			</td>
			<td className="record-traffic">
				<ContentLoader
					{ ...loaderProps }
					height={ 46 }
				>
					<rect x={0} y={10} rx="5" ry="5" width={68} height={6} />
					<rect x={0} y={30} rx="5" ry="5" width={68} height={6} />

					<rect x={83} y={20} rx="2" ry="2" width={11} height={15} />
					<rect x={97} y={30} rx="2" ry="2" width={11} height={5} />
					<rect x={111} y={20} rx="2" ry="2" width={11} height={15} />
					<rect x={125} y={30} rx="2" ry="2" width={11} height={5} />
					<rect x={139} y={20} rx="2" ry="2" width={11} height={15} />
					<rect x={153} y={25} rx="2" ry="2" width={11} height={10} />
					<rect x={167} y={30} rx="2" ry="2" width={11} height={5} />
				</ContentLoader>
			</td>
			<td className="record-lift">&nbsp;</td>
			<td className="record-meta">
				<ContentLoader
					{ ...loaderProps }
					height={ 50 }
				>
					<circle cx={ 12 } cy={ 12 } r="12" />
					<rect x={30} y={30} rx="5" ry="5" width={120} height={6} />
					<rect x={30} y={10} rx="5" ry="5" width={70} height={6} />
				</ContentLoader>
			</td>
		</tr>
	);
};

export default ListItemPlaceholder;