import { connect } from 'react-redux';
import { cancelQuoteCompose } from '../../../actions/compose';
import { makeGetStatus } from '../../../selectors';
import QuoteIndicator from '../components/quote_indicator';

const makeMapStateToProps = () => {
  const getStatus = makeGetStatus();

  const mapStateToProps = state => {
    let statusId = state.getIn(['compose', 'id'], null);
    let editing  = true;

    if (statusId === null) {
      statusId = state.getIn(['compose', 'quote_from']);
      editing  = false;
    }

    return {
      status: getStatus(state, { id: statusId }),
      editing,
    };
  };

  return mapStateToProps;
};

const mapDispatchToProps = dispatch => ({

  onCancel () {
    dispatch(cancelQuoteCompose());
  },

});

export default connect(makeMapStateToProps, mapDispatchToProps)(QuoteIndicator);
