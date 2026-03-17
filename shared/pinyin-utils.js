import {
  EXCEPTIONS,
  PINYINS,
  UNIHANS
} from './vendor/tiny-pinyin-dict.js';

const FIRST_PINYIN_UNIHAN = '\u963f';
const LAST_PINYIN_UNIHAN = '\u9fff';
const LATIN = 1;
const PINYIN = 2;
const UNKNOWN = 3;

let collator = null;
let supportChecked = false;
let supported = false;

// 这里基于 tiny-pinyin 的字典和查找思路做了一层 ESM 包装，
// 只暴露命令面板搜索真正需要的“拼音串”和“首字母串”。

export function isPinyinSearchSupported(forceRedetect = false) {
  if (!forceRedetect && supportChecked) {
    return supported;
  }

  supportChecked = true;

  if (typeof Intl === 'object' && Intl.Collator) {
    collator = new Intl.Collator(['zh-Hans-CN', 'zh-CN']);
    supported = Intl.Collator.supportedLocalesOf(['zh-CN']).length === 1;
  } else {
    supported = false;
  }

  return supported;
}

export function buildPinyinSearchForms(value) {
  const source = String(value || '').trim();
  if (!source || !isPinyinSearchSupported()) {
    return {
      full: '',
      initials: ''
    };
  }

  const tokens = source.split('').map((char) => generateToken(char));
  return {
    full: tokens.map((token) => token.target.toLowerCase()).join(''),
    initials: tokens
      .map((token) => token.type === PINYIN ? token.target[0].toLowerCase() : '')
      .join('')
  };
}

function generateToken(char) {
  const token = {
    source: char
  };

  if (char in EXCEPTIONS) {
    token.type = PINYIN;
    token.target = EXCEPTIONS[char];
    return token;
  }

  let offset = -1;
  let compareResult;

  if (char.charCodeAt(0) < 256) {
    token.type = LATIN;
    token.target = char;
    return token;
  }

  compareResult = collator.compare(char, FIRST_PINYIN_UNIHAN);
  if (compareResult < 0) {
    token.type = UNKNOWN;
    token.target = char;
    return token;
  }

  if (compareResult === 0) {
    token.type = PINYIN;
    offset = 0;
  } else {
    compareResult = collator.compare(char, LAST_PINYIN_UNIHAN);
    if (compareResult > 0) {
      token.type = UNKNOWN;
      token.target = char;
      return token;
    }

    if (compareResult === 0) {
      token.type = PINYIN;
      offset = UNIHANS.length - 1;
    }
  }

  token.type = PINYIN;
  if (offset < 0) {
    let begin = 0;
    let end = UNIHANS.length - 1;

    while (begin <= end) {
      offset = Math.floor((begin + end) / 2);
      const unihan = UNIHANS[offset];
      compareResult = collator.compare(char, unihan);

      if (compareResult === 0) {
        break;
      }

      if (compareResult > 0) {
        begin = offset + 1;
      } else {
        end = offset - 1;
      }
    }
  }

  if (compareResult < 0) {
    offset -= 1;
  }

  token.target = PINYINS[offset];
  if (!token.target) {
    token.type = UNKNOWN;
    token.target = token.source;
  }

  return token;
}
