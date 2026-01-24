# frozen_string_literal: true

class TagsIndex < Chewy::Index
  include DatetimeClampingConcern

  USE_IK_ANALYZER = ENV['ENABLE_IK_ANALYZER'] == 'true'

  settings index: index_preset(refresh_interval: '30s'), analysis: {
    char_filter: {
      tsconvert: {
        type: 'stconvert',
        keep_both: false,
        delimiter: '#',
        convert_type: 't2s',
      },
    } if USE_IK_ANALYZER,

    analyzer: {
      content: {
        tokenizer: USE_IK_ANALYZER ? 'ik_max_word' : 'keyword',
        filter: %w(
          word_delimiter_graph
          lowercase
          asciifolding
          cjk_width
        ),
        char_filter: USE_IK_ANALYZER ? %w(tsconvert) : nil,
      },

      edge_ngram: {
        tokenizer: 'edge_ngram',
        filter: %w(
          lowercase
          asciifolding
          cjk_width
        ),
      },
    },

    tokenizer: {
      edge_ngram: {
        type: 'edge_ngram',
        min_gram: 2,
        max_gram: 15,
      },
    },
  }

  index_scope ::Tag.listable

  crutch :time_period do
    7.days.ago.to_date..0.days.ago.to_date
  end

  root date_detection: false do
    field(:name, type: 'text', analyzer: 'content', value: :display_name) { field(:edge_ngram, type: 'text', analyzer: 'edge_ngram', search_analyzer: 'content') }
    field(:reviewed, type: 'boolean', value: ->(tag) { tag.reviewed? })
    field(:usage, type: 'long', value: ->(tag, crutches) { tag.history.aggregate(crutches.time_period).accounts })
    field(:last_status_at, type: 'date', value: ->(tag) { clamp_date(tag.last_status_at || tag.created_at) })
  end
end
