import { createSelector } from 'reselect';
import { List as ImmutableList, Map as ImmutableMap } from 'immutable';
import { toServerSideType } from 'mastodon/utils/filters';
import { me } from '../initial_state';

const getAccountBase         = (state, id) => state.getIn(['accounts', id], null);
const getAccountCounters     = (state, id) => state.getIn(['accounts_counters', id], null);
const getAccountRelationship = (state, id) => state.getIn(['relationships', id], null);
const getAccountMoved        = (state, id) => state.getIn(['accounts', state.getIn(['accounts', id, 'moved'])]);

export const makeGetAccount = () => {
  return createSelector([getAccountBase, getAccountCounters, getAccountRelationship, getAccountMoved], (base, counters, relationship, moved) => {
    if (base === null) {
      return null;
    }

    return base.merge(counters).withMutations(map => {
      map.set('relationship', relationship);
      map.set('moved', moved);
    });
  });
};

const getFilters = (state, { contextType }) => {
  if (!contextType) return null;

  const serverSideType = toServerSideType(contextType);
  const now = new Date();

  return state.get('filters').filter((filter) => filter.get('context').includes(serverSideType) && (filter.get('expires_at') === null || filter.get('expires_at') > now));
};

export const makeGetStatus = () => {
  return createSelector(
    [
      (state, { id }) => state.getIn(['statuses', id]),
      (state, { id }) => state.getIn(['statuses', state.getIn(['statuses', id, 'reblog'])]),
      (state, { id }) => state.getIn(['statuses', state.getIn(['statuses', id, 'quote_id'])]),
      (state, { id }) => state.getIn(['accounts', state.getIn(['statuses', id, 'account'])]),
      (state, { id }) => state.getIn(['accounts', state.getIn(['statuses', state.getIn(['statuses', id, 'reblog']), 'account'])]),
      (state, { id }) => state.getIn(['accounts', state.getIn(['statuses', state.getIn(['statuses', id, 'quote_id']), 'account'])]),
      (state, { id }) => state.getIn(['accounts', state.getIn(['statuses', state.getIn(['statuses', id, 'reblog']), 'quote', 'account'])]),
      (state, { id }) => state.getIn(['relationships', state.getIn(['statuses', id, 'account'])]),
      (state, { id }) => state.getIn(['relationships', state.getIn(['statuses', state.getIn(['statuses', id, 'reblog']), 'account'])]),
      (state, { id }) => state.getIn(['relationships', state.getIn(['statuses', state.getIn(['statuses', id, 'quote_id']), 'account'])]),
      (state, { id }) => state.getIn(['relationships', state.getIn(['statuses', state.getIn(['statuses', id, 'reblog']), 'quote', 'account'])]),
      (state, { id }) => state.getIn(['accounts', state.getIn(['accounts', state.getIn(['statuses', id, 'account']), 'moved'])]),
      (state, { id }) => state.getIn(['accounts', state.getIn(['accounts', state.getIn(['statuses', state.getIn(['statuses', id, 'reblog']), 'account']), 'moved'])]),
      (state, { id }) => state.getIn(['accounts', state.getIn(['accounts', state.getIn(['statuses', state.getIn(['statuses', id, 'quote_id']), 'account']), 'moved'])]),
      (state, { id }) => state.getIn(['accounts', state.getIn(['accounts', state.getIn(['statuses', state.getIn(['statuses', id, 'reblog']), 'quote', 'account']), 'moved'])]),
      getFilters,
    ],

    (statusBase, statusReblog, statusQuote, accountBase, accountReblog, accountQuote, accountReblogQuote, relationship, reblogRelationship, quoteRelationship, reblogQuoteRelationship, moved, reblogMoved, quoteMoved, reblogQuoteMoved, filters) => {
      if (!statusBase || statusBase.get('isLoading')) {
        return null;
      }

      accountBase = accountBase.withMutations(map => {
        map.set('relationship', relationship);
        map.set('moved', moved);
      });

      if (statusReblog) {
        accountReblog = accountReblog.withMutations(map => {
          map.set('relationship', reblogRelationship);
          map.set('moved', reblogMoved);
        });
        statusReblog = statusReblog.set('account', accountReblog);
      } else {
        statusReblog = null;
      }

      if (statusQuote) {
        accountQuote = accountQuote.withMutations(map => {
          map.set('relationship', quoteRelationship);
          map.set('moved', quoteMoved);
        });
        statusQuote = statusQuote.set('account', accountQuote);
      } else {
        statusQuote = null;
      }

      if (statusReblog && accountReblogQuote) {
        accountReblogQuote = accountReblog.withMutations(map => {
          map.set('relationship', reblogQuoteRelationship);
          map.set('moved', reblogQuoteMoved);
        });
        statusReblog = statusReblog.setIn(['quote', 'account'], accountReblogQuote);
      }

      let filtered = false;
      if ((accountReblog || accountBase).get('id') !== me && filters) {
        let filterResults = statusReblog?.get('filtered') || statusBase.get('filtered') || ImmutableList();
        if (filterResults.some((result) => filters.getIn([result.get('filter'), 'filter_action']) === 'hide')) {
          return null;
        }
        filterResults = filterResults.filter(result => filters.has(result.get('filter')));
        if (!filterResults.isEmpty()) {
          filtered = filterResults.map(result => filters.getIn([result.get('filter'), 'title']));
        }
      }

      return statusBase.withMutations(map => {
        map.set('reblog', statusReblog);
        map.set('quote', statusQuote);
        map.set('account', accountBase);
        map.set('matched_filters', filtered);
      });
    },
  );
};

export const makeGetPictureInPicture = () => {
  return createSelector([
    (state, { id }) => state.get('picture_in_picture').statusId === id,
    (state) => state.getIn(['meta', 'layout']) !== 'mobile',
  ], (inUse, available) => ImmutableMap({
    inUse: inUse && available,
    available,
  }));
};

const getAlertsBase = state => state.get('alerts');

export const getAlerts = createSelector([getAlertsBase], (base) => {
  let arr = [];

  base.forEach(item => {
    arr.push({
      message: item.get('message'),
      message_values: item.get('message_values'),
      title: item.get('title'),
      key: item.get('key'),
      dismissAfter: 5000,
      barStyle: {
        zIndex: 200,
      },
    });
  });

  return arr;
});

export const makeGetNotification = () => createSelector([
  (_, base)             => base,
  (state, _, accountId) => state.getIn(['accounts', accountId]),
], (base, account) => base.set('account', account));

export const makeGetReport = () => createSelector([
  (_, base) => base,
  (state, _, targetAccountId) => state.getIn(['accounts', targetAccountId]),
], (base, targetAccount) => base.set('target_account', targetAccount));

export const getAccountGallery = createSelector([
  (state, id) => state.getIn(['timelines', `account:${id}:media`, 'items'], ImmutableList()),
  state       => state.get('statuses'),
  (state, id) => state.getIn(['accounts', id]),
], (statusIds, statuses, account) => {
  let medias = ImmutableList();

  statusIds.forEach(statusId => {
    const status = statuses.get(statusId);
    medias = medias.concat(status.get('media_attachments').map(media => media.set('status', status).set('account', account)));
  });

  return medias;
});

export const getAccountHidden = createSelector([
  (state, id) => state.getIn(['accounts', id, 'hidden']),
  (state, id) => state.getIn(['relationships', id, 'following']) || state.getIn(['relationships', id, 'requested']),
  (state, id) => id === me,
], (hidden, followingOrRequested, isSelf) => {
  return hidden && !(isSelf || followingOrRequested);
});
