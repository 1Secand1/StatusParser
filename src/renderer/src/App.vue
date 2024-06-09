<template>
  <main class="main">
    <div class="header">
      <h1 class="header__title">StatusParser</h1>
      <span class="header__status"> {{ currentStatus }}</span>
    </div>

    <div v-show="currentStatus === downloadStatuses.displayResult" class="box">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Статус</th>
            <th scope="col">Количество</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(value, kay) in numberOfStatuses" :key="kay">
            <th style="width: 100%" scope="row">{{ kay }}</th>
            <td style="text-align: center">
              {{ value }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-show="currentStatus === downloadStatuses.displayResult" class="box">
      <table class="table">
        <thead>
          <tr>
            <th scope="col">Статус</th>
            <th scope="col">Ссылка</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="value in values" :key="value">
            <th scope="row">{{ value?.status ?? 'Не найдено' }}</th>
            <td>
              <a :href="value?.url">{{ value?.url ?? 'нету' }}</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <textarea
      v-show="currentStatus === downloadStatuses.referenceWaiting"
      v-model="textareaValue"
      class="textInput"
    />

    <button
      v-show="currentStatus === downloadStatuses.referenceWaiting"
      class="button"
      @click="getDate"
    >
      Получить
    </button>

    <button v-if="currentStatus === downloadStatuses.displayResult" class="button" @click="restart">
      Использовать другие значения
    </button>
  </main>
</template>

<script setup>
import Versions from './components/Versions.vue'
import { computed, reactive, ref, toRaw } from 'vue'
const ipcHandle = () => window.electron.ipcRenderer.send('ping')
const parseUrls = window.api.parseUrls

const values = ref([])

const statuses = reactive({})

const textareaValue = ref(
  'https://anketa.alfabank.ru/cc-ui/tracking?appId=d8d20a65b1ac4f1690820d5cc796cc8bhttps://anketa.alfabank.ru/cc-ui/tracking?appId=a2f234a11cf4486580fe78f557a66f6fhttps://anketa.alfabank.ru/cc-ui/tracking?appId=2d64597d610d46edb7e483419a098f4fhttps://anketa.alfabank.ru/cc-ui/tracking?appId=3373284b5f4a481281d56cbc34dd9d46'
)

const downloadStatuses = {
  referenceWaiting: 'ожидание ввода ссылок',
  gettingStatuses: 'обработка данных',
  displayResult: ' данные получены'
}
const currentStatus = ref(downloadStatuses.referenceWaiting)
const numberOfStatuses = computed(() => {
  const result = values.value.reduce((obg, { status }) => {
    return (obg[status] = (obg[status] ?? 0) + 1), obg
  }, {})

  return result
})

async function getDate() {
  currentStatus.value = downloadStatuses.gettingStatuses

  let urls = textareaValue.value.split(/(?=https)/)

  values.value = await runtimeMeasurement(() => {
    return parseUrls(urls)
  })

  console.log(toRaw(values.value))

  currentStatus.value = downloadStatuses.displayResult
}

function restart() {
  values.value = []
  currentStatus.value = downloadStatuses.referenceWaiting
}

async function runtimeMeasurement(fun) {
  const start = performance.now()
  try {
    return await fun()
  } finally {
    const end = performance.now()
    console.log(`Скорость выполнения ${Math.floor((end - start) / 1000)} с`)
  }
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header__title {
  padding: 0;
  margin: 0;
}

.header__status {
  padding: 0px 5px;
  background: #000;
  background: #3d3434;
  border-radius: 5px;
}

.main {
  display: flex;
  flex-direction: column;
  max-width: 500px;
  margin-inline: auto;
  height: 100svh;
}

.button {
  width: 100%;
  border: none;
  background: #3d3434;
  border-radius: 5px;
  padding: 8px 10px;
  color: rgb(184, 184, 184);
  cursor: pointer;
  margin-top: 10px;
  margin-top: auto;
}

.textInput {
  width: 100%;
  height: 80%;
  background: #3d3434;
  color: white;
  resize: none;
  border: none;
  padding: 5px;
  border-radius: 5px;
}

.box {
  display: flex;
  flex-direction: column;
  overflow-x: auto;
  flex: 0 1 auto;
  height: max-content;

  min-height: 200px;
}

table {
  border-collapse: collapse;
  font-size: 0.8rem;
  letter-spacing: 1px;
}

th,
td {
  border: 1px solid rgb(160 160 160);
  text-align: left;
  padding: 8px 10px;
}

td:last-of-type {
  text-align: left;
}

tfoot td {
  font-weight: bold;
}
</style>
