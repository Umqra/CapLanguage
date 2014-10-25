/**
 * Created by Umqra on 23.10.2014.
 */

var Keywords = ["set", "add", "sbt", "mlt", "jmp", "jiz", "jin", "jip", "red", "wrt", "lbl", "srp"];
var OldCountLines = 1;

function isLetter(ch)
{
	var Letters = "qwertyuiopasdfghjklzxcvbnm";
	for (var i = 0; i < Letters.length; i++)
	{
		if (Letters.charAt(i) == ch)
			return true;
	}
	return false;
}

function isDigit(ch)
{
	var Digits = "0123456789";
	for (var i = 0; i < Digits.length; i++)
	{
		if (Digits.charAt(i) == ch)
			return true;
	}
	return false;
}

function isSpace(ch)
{
	return ch == ' ' || ch == '\t' || ch == '\n';
}

function isVariable(word)
{
	return word != "" && isLetter(word.charAt(0));
}

function isNumber(word)
{
	if (word == "")
		return false;
	for (var i = 0; i < word.length; i++)
	{
		if (!isDigit(word.charAt(i)))
			return false;
	}
	return true;
}

function isKeyword(word) {
	for (var i = 0; i < Keywords.length; i++)
	{
		if (word == Keywords[i])
			return true;
	}
	return false;
}

function processWord(word)
{
	if (isKeyword(word))
		return "<div class=\"keywords\">" + word + "</div>";
	if (isVariable(word))
		return "<div class=\"variables\">" + word + "</div>";
	if (isNumber(word))
		return "<div class=\"numbers\">" + word + "</div>";
	return word;
}

function getChar(ch)
{
	if (ch == '\n')
		return "<br>";
	return ch;
}

function formatCode(text)
{
	var result = "";
	var word = "";
	for (var i = 0; i < text.length; i++) {
		var ch = text.charAt(i);
		if (!isSpace(ch))
			word += ch;
		else
		{
			if (word != "")
				result += processWord(word);
			result += getChar(ch);
			word = "";
		}
	}
	if (word != "")
		result += processWord(word);
	return result;
}

function getCodeLines(text)
{
	var result = new Array();
	var line = "";
	for (var i = 0; i < text.length; i++)
	{
		var ch = text.charAt(i);
		if (ch == '\n') {
			result.push(line);
			line = "";
		}
		else
			line += ch;
	}
	result.push(line);
	return result;
}

function changeText(e) {
	var text = document.getElementsByName("codeArea")[0].value;
	var lines = getCodeLines(text);
	preprocessCode(lines);
	if (OldCountLines != lines.length)
	{
		var errorString = "";
		for (var i = 0; i < ListErrors.length; i++)
			errorString += ListErrors[i] + "\n";
		document.getElementsByName("errors")[0].innerHTML = errorString;
	}
	OldCountLines = lines.length;
	document.getElementsByName("viewArea")[0].innerHTML = formatCode(text);
}

function run(e)
{
	document.getElementsByName("output")[0].value = "";
	var text = document.getElementsByName("codeArea")[0].value;
	var lines = getCodeLines(text);
	preprocessCode(lines);
	if (preprocessError == true)
	{
		document.getElementsByName("output")[0].value = "Fix all errors!"
		return;
	}
	processCode(lines, 0);
}