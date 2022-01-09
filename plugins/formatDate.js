import Vue from 'vue'

const options = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
}

Vue.filter('formatDate', (dateStr) =>
  Intl.DateTimeFormat('us-EN', options).format(new Date(dateStr))
)
