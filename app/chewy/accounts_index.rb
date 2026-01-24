# frozen_string_literal: true

class AccountsIndex < Chewy::Index
  include DatetimeClampingConcern

  USE_IK_ANALYZER = ENV['ENABLE_IK_ANALYZER'] == 'true'

  settings index: index_preset(refresh_interval: '30s'), analysis: {
    filter: {
      english_stop: {
        type: 'stop',
        stopwords: '_english_',
      },

      english_stemmer: {
        type: 'stemmer',
        language: 'english',
      },

      english_possessive_stemmer: {
        type: 'stemmer',
        language: 'possessive_english',
      },

      word_joiner: {
        type: 'shingle',
        output_unigrams: true,
        token_separator: '',
      },
    },

    char_filter: {
      tsconvert: {
        type: 'stconvert',
        keep_both: false,
        delimiter: '#',
        convert_type: 't2s',
      },
    } if USE_IK_ANALYZER,

    analyzer: {
      # "The FOOING's bar" becomes "foo bar"
      natural: {
        tokenizer: 'standard',
        filter: %w(
          lowercase
          asciifolding
          cjk_width
          elision
          english_possessive_stemmer
          english_stop
          english_stemmer
        ),
      },

      # "FOO bar" becomes "foo bar"
      verbatim: {
        tokenizer: 'standard',
        filter: %w(lowercase asciifolding cjk_width),
      },

      # "Foo bar" becomes "foo bar foobar"
      word_join_analyzer: {
        type: 'custom',
        tokenizer: 'standard',
        filter: %w(lowercase asciifolding cjk_width word_joiner),
      },

      # "Foo bar" becomes "f fo foo b ba bar"
      edge_ngram: {
        tokenizer: 'edge_ngram',
        filter: %w(lowercase asciifolding cjk_width),
      },

      ik_max_word: {
        tokenizer: 'ik_max_word',
        filter: %w(lowercase asciifolding cjk_width),
        char_filter: %w(tsconvert),
      },
    } if USE_IK_ANALYZER,

    tokenizer: {
      edge_ngram: {
        type: 'edge_ngram',
        min_gram: 1,
        max_gram: 15,
      },
    },
  }

  index_scope ::Account.searchable.includes(:account_stat)

  root date_detection: false do
    field(:id, type: 'long')
    field(:following_count, type: 'long')
    field(:followers_count, type: 'long')
    field(:properties, type: 'keyword', value: ->(account) { account.searchable_properties })
    field(:last_status_at, type: 'date', value: ->(account) { clamp_date(account.last_status_at || account.created_at) })
    if USE_IK_ANALYZER
      field(:display_name, type: 'text', analyzer: 'ik_max_word') do
        field :edge_ngram, type: 'text', analyzer: 'edge_ngram', search_analyzer: 'ik_max_word'
      end
      field(:username, type: 'text', analyzer: 'ik_max_word', value: ->(account) { [account.username, account.domain].compact.join('@') }) do
        field :edge_ngram, type: 'text', analyzer: 'edge_ngram', search_analyzer: 'ik_max_word'
      end
    else
      field(:display_name, type: 'text', analyzer: 'verbatim') { field :edge_ngram, type: 'text', analyzer: 'edge_ngram', search_analyzer: 'verbatim' }
      field(:username, type: 'text', analyzer: 'verbatim', value: ->(account) { [account.username, account.domain].compact.join('@') }) { field :edge_ngram, type: 'text', analyzer: 'edge_ngram', search_analyzer: 'verbatim' }
    end
    field(:text, type: 'text', analyzer: 'verbatim', value: ->(account) { account.searchable_text }) { field :stemmed, type: 'text', analyzer: 'natural' }
  end
end
