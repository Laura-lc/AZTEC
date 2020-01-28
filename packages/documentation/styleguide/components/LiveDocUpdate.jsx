import React, { Component } from 'react';
import parse from 'comment-parser';
import PropTypes from 'prop-types';

import MethodArgumentRenderer from './MethodArgumentRenderer';
import MethodDescription from './MethodDescription';
import MethodReturnRenderer from './MethodReturnRenderer';
import parseTagsForAPI from '../utils/parseTagsForAPI';

class LiveDocUpdate extends Component {
  state = {
    parsedReturns: [],
    parsedArguments: [],
  };

  componentDidMount() {
    const { name } = this.props;
    if (name.includes('.')) {
      this.parseGitDocs();
    }
  }

  componentDidUpdate(prevProps) {
    const { name: prevName } = prevProps;
    const { name } = this.props;

    if (prevName !== name && name.includes('.')) {
      this.parseGitDocs();
    }
  }

  parseGitDocs = async () => {
    const url =
      'https://raw.githubusercontent.com/AztecProtocol/AZTEC/feat-doc-examples/packages/extension/src/client/apis/Asset.js';
    const response = await fetch(url);
    const apiText = await response.text();

    const parsedTags = parse(apiText.toString());
    const { name } = this.props;

    let APItags;
    try {
      APItags = parseTagsForAPI(name, parsedTags);
    } catch (error) {
      throw new Error('Could not fetch docs for this API method');
    }

    const parsedArguments = APItags.tags.filter((tag) => {
      return tag.tag !== 'returns' && tag.tag !== 'function';
    });

    const parsedReturns = APItags.tags.filter((tag) => {
      return tag.tag === 'returns';
    });

    const parsedDescription = APItags.tags.filter((tag) => {
      return tag.tag === 'description';
    });

    this.setState({ parsedArguments, parsedReturns, parsedDescription });
  };

  render() {
    const { parsedArguments, parsedReturns, parsedDescription } = this.state;
    console.log({ parsedDescription });

    return (
      <>
        <MethodDescription description={parsedDescription} />
        <MethodArgumentRenderer methods={[...parsedArguments]} />
        <MethodReturnRenderer methods={[...parsedReturns]} />
      </>
    );
  }
}

LiveDocUpdate.propTypes = {
  name: PropTypes.string.isRequired,
};

export default LiveDocUpdate;