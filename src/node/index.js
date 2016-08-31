import Heimdall from '../heimdall';
import Session from '../session';
import now from '../time';
import Token from '../token';
import Node from '../node';
import setupSession from '../setup-session';

setupSession(process);

Heimdall.Node = Node;
Heimdall.Token = Token;
Heimdall.now = now;

export default new Heimdall(process._heimdall_session_2);
