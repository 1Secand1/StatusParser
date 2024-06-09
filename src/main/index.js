const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { join } = require('path')
const { electronApp, optimizer, is } = require('@electron-toolkit/utils')
import icon from '../../resources/icon.png?asset'
const puppeteer = require('puppeteer')

async function parseUrls(urls) {
  console.log('Starting to parse URLs:', urls)

  let browser
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    console.log('Puppeteer launched with bundled Chromium')
  } catch (error) {
    console.error('Error launching Puppeteer:', error)
    throw new Error('Failed to launch Puppeteer')
  }

  try {
    const results = await Promise.all(urls.map((url) => parseUrl(browser, url)))
    console.log('Parsed results:', results)
    return results
  } catch (error) {
    console.error('Error during parsing URLs:', error)
    throw error
  } finally {
    await browser.close()
  }
}

async function parseUrl(browser, url) {
  const page = await browser.newPage()
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    if (['image', 'stylesheet', 'font', 'script'].includes(req.resourceType())) {
      req.abort()
    } else {
      req.continue()
    }
  })

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    const statusText = await extractStatusText(page)
    return {
      url,
      status: statusText
    }
  } catch (error) {
    console.error(`Error parsing ${url}:`, error)
    return null
  } finally {
    await page.close()
  }
}

async function extractStatusText(page) {
  console.log('Начинаем получать данные')
  const selectors = [
    '[data-test-id="declineCardTitle"]',
    '[data-test-id="trackingHeaderTitle"]',
    '.typography__component_zd3y8.style_title__HWbSe.typography__system-small_xwmt7.typography__bold_zd3y8',
    '.typography__component_zd3y8.style_title__VI4p_.typography__styrene-medium_1gfjy.typography__bold_zd3y8',
    '#declineStatus',
    '#approveStatus'
  ]
  for (const selector of selectors) {
    const text = await getTextContentBySelector(page, selector)
    console.log(text, selector)
    if (text) {
      return text
    }
  }
  return null
}

async function getTextContentBySelector(page, selector) {
  return page.evaluate((selector2) => {
    const element = document.querySelector(selector2)
    return element ? element.textContent : null
  }, selector)
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    shell.openExternal(url)
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle('parse-urls', async (event, urls) => {
    if (!Array.isArray(urls)) {
      const error = new Error('Invalid argument: urls should be an array')
      return { error: error.message, stack: error.stack }
    }
    try {
      const results = await parseUrls(urls)
      return results
    } catch (error) {
      console.error('Error in parse-urls:', error)
      return { error: error.message, stack: error.stack }
    }
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
