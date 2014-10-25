/**
 * Created by Umqra on 22.10.2014.
 */

var EOF = -1;
var CURRENT_LINE = -2;

var ListCommands = ["set", "add", "sbt", "mlt", "jmp", "jiz", "jin", "jip", "red", "wrt", "lbl", "srp"];
var CommandCountArguments = [2, 2, 2, 2, 1, 2, 2, 2, 1, 1, 1, 0]

var MemorySize = 1024;
var Memory = new Array(MemorySize);
var UsedMemory = new Array(MemorySize);
var LabelPosition = new Object();
var VariableAddress = new Object();

function printError(lineNumber, error){
	WSH.echo("Error at line " + lineNumber + ": " + error);
	preprocessError = true;
}

function printFail(error) {
	WSH.echo("Fail: " + error);
	WSH.Quit(0);
}

function getFreeAddress() {
	for (var i = 0; i < MemorySize; i++) {
		if (UsedMemory[i] == undefined)
			return i;
	}
	printFail("virtual memory overflow")
}

function getVariableAddress(var1) {
	if (VariableAddress[var1] == undefined) {
		var address = getFreeAddress();
		VariableAddress[var1] = address;
		UsedMemory[address] = true;
	}
	return VariableAddress[var1];
}

function Read() {
	var Digits = "0123456789";
	this.isDigit = function(ch) {
		for (var i = 0; i < 10; i++) {
			if (Digits.charAt(i) == ch)
				return true;
		}
		return false;
	}
	this.getDigitValue = function(ch)
	{
		for (var i = 0; i < 10; i++)
			if (Digits.charAt(i) == ch)
				return i;
	}
	this.isNumber = function(value)
	{
		var startPos = 0;
		if (value.charAt(0) == '+' || value.charAt(0) == '-')
			startPos++;
		if (value.length - startPos > 7)
			return false;
		for (var i = startPos; i < value.length; i++)
		{
			if (!this.isDigit(value.charAt(i)))
				return false;
		}
		return true;
	}
	this.buffer = "";
	this.bufferPtr = 0;
	this.readInt = function ()
	{
		if (this.buffer.length == this.bufferPtr) {
			this.buffer = WSH.StdIn.ReadLine();
			this.bufferPtr = 0;
		}
		var number = 0;
		while (this.bufferPtr < this.buffer.length && !this.isDigit(this.buffer.charAt(this.bufferPtr)))
			this.bufferPtr++;
		if (this.bufferPtr == this.buffer.length)
			return this.readInt();
		var sgn = '+';
		if (this.bufferPtr > 0 && this.buffer.charAt(this.bufferPtr - 1) == '-')
			sgn = '-';
		var number = 0;
		while (this.bufferPtr < this.buffer.length && this.isDigit(this.buffer.charAt(this.bufferPtr)))
		{
			number *= 10;
			number += this.getDigitValue(this.buffer.charAt(this.bufferPtr));
			this.bufferPtr++;
		}
		if (number > 10000000)
			printFail("bad number(" + number + ")")
		number = (sgn == '-' ? -number : number);
		return number;
	}
}
var Read = new Read();

function Validator(){
	this.validateNumber = function(val) {
		return Read.isNumber(val);
	}
	this.validateLabel = function(label) {
		if (Read.isDigit(label.charAt(0)))
			return "bad label name (" + label + ")";
		return true;
	}
	this.validateVariable = function(variable) {
		if (Read.isDigit(variable.charAt(0)))
			return "bad variable name (" + variable + ")";
		return true;
	}
}
var Validator = new Validator();

function Preprocess() {
	this.preprocessTwoVariable = function (var1, var2, line)
	{
		if (Validator.validateVariable(var1) != true)
			return Validator.validateVariable(var1);
		return Validator.validateVariable(var2);
	}
	this.preprocessVariableValue = function(var1, val1, line) {
		if (Validator.validateVariable(var1) != true)
			return Validator.validateVariable(var1);
		if (Validator.validateVariable(val1) || Validator.validateNumber(val1))
			return true;
		return "bad second argument value"
	}
	this.preprocessOneLabel = function (label, line)
	{
		if (Validator.validateLabel(label) != true)
			return Validator.validateLabel(label);
		return true;
	}
	this.preprocessLabel = function(label, line)
	{
		if (Validator.validateLabel(label) != true)
			return Validator.validateLabel(label);
		if (LabelPosition[label] != undefined)
			return "equal labels (" + label + ")"
		LabelPosition[label] = line;
		return true;
	}
	this.preprocessVariableLabel = function(var1, label, line)
	{
		if (Validator.validateVariable(var1) != true)
			return Validator.validateVariable(var1);
		return Validator.validateLabel(label);
	}
	this.preprocessVariable = function(var1) {
		return Validator.validateVariable(var1);
	}
	this.preprocessSurprise = function() {
		return true;
	}
}
var Preprocess = new Preprocess();
var CommandPreprocess = [
	Preprocess.preprocessVariableValue,
	Preprocess.preprocessVariableValue,
	Preprocess.preprocessVariableValue,
	Preprocess.preprocessVariableValue,
	Preprocess.preprocessOneLabel,
	Preprocess.preprocessVariableLabel,
	Preprocess.preprocessVariableLabel,
	Preprocess.preprocessVariableLabel,
	Preprocess.preprocessVariable,
	Preprocess.preprocessVariable,
	Preprocess.preprocessLabel,
	Preprocess.preprocessSurprise
];

function Process() {

	this.processSet = function(var1, var2){
		var addr1 = getVariableAddress(var1);
		if (Validator.validateNumber(var2))
			Memory[addr1] = +var2;
		else {
			var addr2 = getVariableAddress(var2);
			Memory[addr1] = +Memory[addr2];
		}
		return CURRENT_LINE;
	}
	this.processAdd = function(var1, var2){
		var addr1 = getVariableAddress(var1);
		if (Validator.validateNumber(var2))
			Memory[addr1] += +var2;
		else {
			var addr2 = getVariableAddress(var2);
			Memory[addr1] += +Memory[addr2];
		}
		return CURRENT_LINE;
	}
	this.processSubtract = function(var1, var2){
		var addr1 = getVariableAddress(var1);
		if (Validator.validateNumber(var2))
			Memory[addr1] -= +var2;
		else {
			var addr2 = getVariableAddress(var2);
			Memory[addr1] -= +Memory[addr2];
		}
		return CURRENT_LINE;
	}
	this.processMult = function(var1, var2)
	{
		var addr1 = getVariableAddress(var1);
		if (Validator.validateNumber(var2))
			Memory[addr1] *= +var2;
		else {
			var addr2 = getVariableAddress(var2);
			Memory[addr1] *= +Memory[addr2];
		}
		return CURRENT_LINE;
	}
	this.processJump = function (label) {
		if (LabelPosition[label] == undefined)
			printFail("undefined label(" + label + ")");
		return LabelPosition[label];
	}
	this.processJumpIfZero = function(var1, label){
		if (LabelPosition[label] == undefined)
			printFail("undefined label(" + label + ")");
		var addr1 = getVariableAddress(var1);
		if (Memory[addr1] == 0)
			return LabelPosition[label];
		return CURRENT_LINE;
	}
	this.processJumpIfNeg = function(var1, label) {
		if (LabelPosition[label] == undefined)
			printFail("undefined label(" + label + ")");
		var addr1 = getVariableAddress(var1);
		if (Memory[addr1] < 0)
			return LabelPosition[label];
		return CURRENT_LINE;
	}
	this.processJumpIfPos = function(var1, label){
		if (LabelPosition[label] == undefined)
			printFail("undefined label(" + label + ")");
		var addr1 = getVariableAddress(var1);
		if (Memory[addr1] > 0)
			return LabelPosition[label];
		return CURRENT_LINE;
	}
	this.processRead = function (var1) {
		var addr1 = getVariableAddress(var1);
		Memory[addr1] = Read.readInt();
		return CURRENT_LINE;
	}
	this.processWrite = function(var1)
	{
		var addr1 = getVariableAddress(var1);
		WSH.echo(Memory[addr1]);
		return CURRENT_LINE;
	}
	this.processLabel = function(label)
	{
		return CURRENT_LINE;
	}
	this.processSurprise = function() {
		WSH.echo("Surprise, Motherfucker!")
		return CURRENT_LINE;
	}
}
var Process = new Process();
var CommandProcess = [
	Process.processSet,
	Process.processAdd,
	Process.processSubtract,
	Process.processMult,
	Process.processJump,
	Process.processJumpIfZero,
	Process.processJumpIfNeg,
	Process.processJumpIfPos,
	Process.processRead,
	Process.processWrite,
	Process.processLabel,
	Process.processSurprise
];

var preprocessError = false;

function printHelp() {
	WSH.echo("Help:\n");
}

function getTokens(line) {

	if (line == null)
		return "";
	var tokens = new Array();
	var word = "";
	for (var i = 0; i < line.length; i++)
	{
		if (line.charAt(i) == ' ')
		{
			if (word != "")
				tokens.push(word)
			word = "";
		}
		else
			word += line.charAt(i);
	}
	if (word != "")
		tokens.push(word);
	return tokens;
}

function getCommandNumber(com) {
	for (var i = 0; i < ListCommands.length; i++) {
		if (ListCommands[i] == com)
			return i;
	}
	return -1;
}

function preprocessLine(line, lineNumber) {
	if (line == "")
		return;
	var tokens = getTokens(line);

	var commandNum = getCommandNumber(tokens[0]);
	if (commandNum == -1) {
		printError(lineNumber, "bad command name (" + tokens[0] + ")");
		return;
	}
	var countArgument = tokens.length - 1;
	if (countArgument != CommandCountArguments[commandNum]) {
		printError(lineNumber, "bad count arguments for command " + tokens[0])
	}
	var preprocessCommand;
	if (countArgument == 0)
		preprocessCommand = CommandPreprocess[commandNum]();
	if (countArgument == 1)
		preprocessCommand = CommandPreprocess[commandNum](tokens[1], lineNumber);
	else if (countArgument == 2)
		preprocessCommand = CommandPreprocess[commandNum](tokens[1], tokens[2], lineNumber);

	if (preprocessCommand != true)
		printError(lineNumber, preprocessCommand);
}

function preprocessCode(codeLines) {
	for (var lineNumber = 0; lineNumber < codeLines.length; lineNumber++) {
		preprocessLine(codeLines[lineNumber], lineNumber + 1);
	}
}

function processCode(codeLines, currentLine) {
	while (true) {
		if (currentLine == -1 || currentLine == codeLines.length)
			return;
		var tokens = getTokens(codeLines[currentLine]);
		if (tokens.length == 0) {
			currentLine++;
			continue;
		}
		var commandNum = getCommandNumber(tokens[0]);
		var newLine;
		if (CommandCountArguments[commandNum] == 0)
			newLine = CommandProcess[commandNum]();
		if (CommandCountArguments[commandNum] == 1)
			newLine = CommandProcess[commandNum](tokens[1]);
		else if (CommandCountArguments[commandNum] == 2)
			newLine = CommandProcess[commandNum](tokens[1], tokens[2]);
		if (newLine == CURRENT_LINE)
			currentLine++;
		else
			currentLine = newLine;
	}
}

function Main() {
	var codeLines = new Array()
	var args = WSH.Arguments;
	var countArgs = args.Length;
	if (countArgs == 0)
	{
		//TODO: read lines from console
	}
	else if (countArgs == 1 && args(0) != "/?") {
		var source = args(0);
		var fso = new ActiveXObject("Scripting.FileSystemObject");
		var codeFile = fso.OpenTextFile(source, 1, false);
		while (!codeFile.AtEndOfStream) {
			codeLines.push(codeFile.ReadLine());
		}
		preprocessCode(codeLines);
		if (preprocessError)
			WSH.Quit(0);
		processCode(codeLines, 0);
	}
    else
        printHelp();
}

Main();