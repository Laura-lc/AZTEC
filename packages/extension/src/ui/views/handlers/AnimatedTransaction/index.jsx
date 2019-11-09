import React, {
    PureComponent,
} from 'react';
import PropTypes from 'prop-types';
import {
    Block,
    Text,
    FlexBox,
} from '@aztec/guacamole-ui';
import {
    errorLog,
} from '~utils/log';
import {
    closeWindowDelay,
} from '~ui/config/settings';
import i18n from '~ui/helpers/i18n';
import returnAndClose from '~uiModules/helpers/returnAndClose';
import AnimatedContent from './AnimatedContent';
import asyncForEach from '~utils/asyncForEach';
import Footer from '~ui/components/Footer';
import Loading from '~ui/views/Loading';
import {
    spacingMap,
} from '~ui/styles/guacamole-vars';

class Transaction extends PureComponent {
    static getDerivedStateFromProps(nextProps, prevState) {
        const {
            prevProps: {
                retry: prevRetry,
            },
        } = prevState;
        const {
            retry,
        } = nextProps;
        if (retry === prevRetry) {
            return null;
        }

        const {
            initialStep,
            initialData,
            fetchInitialData,
            onStep,
        } = nextProps;
        const {
            history,
        } = prevState;

        const requireInitialFetch = !history && !!fetchInitialData;

        const data = history
            ? history[initialStep]
            : initialData;

        let extraData;
        if (onStep && !requireInitialFetch) {
            extraData = onStep(initialStep, data);
        }

        return {
            step: initialStep,
            data: {
                ...data,
                ...extraData,
            },
            history: !history
                ? [data]
                : history.slice(0, initialStep + 1),
            loading: requireInitialFetch,
            pendingInitialFetch: requireInitialFetch,
            prevProps: {
                retry,
            },
        };
    }

    constructor(props) {
        super(props);
        const {
            initialStep,
            initialTask,
            initialData,
        } = props;

        this.state = {
            step: initialStep,
            data: null,
            history: null,
            loading: false,
            currentTask: initialTask,
            data: initialData,
            direction: '1',
            error: null,
            validationError: null,
            prevProps: {
                retry: -1,
            },
        };
    }

    componentDidMount() {
        this.fetchInitialData();
    }

    handleGoBack = () => {
        const {
            onGoBack,
        } = this.props;
        const {
            step,
            data: prevData,
            history,
        } = this.state;

        let stepOffset = 1;
        let modifiedData;
        if (onGoBack) {
            ({
                stepOffset = 1,
                ...modifiedData
            } = onGoBack(step, {
                ...prevData,
            }));
        }

        const backToStep = step - stepOffset;
        const historyData = history[backToStep];

        this.goToStep({
            step: backToStep,
            direction: '-1',
            data: {
                ...historyData,
                ...modifiedData,
            },
            history: history.slice(0, backToStep + 1),
        });
    };

    runAsyncTasks = async () => {
        const {
            steps,
            onGoNext,
        } = this.props;
        const {
            step,
            data: stateData,
            history: prevHistory,
        } = this.state;
        const prevData = prevHistory[step];
        let data = {
            ...prevData,
        };

        const {
            tasks,
            validate,
        } = steps[step];

        const validationError = validate
            ? await validate(stateData)
            : null;
        if (validationError) {
            this.setState({
                loading: false,
                validationError,
            });
            return;
        }

        let stepOffset = 1;
        if (onGoNext) {
            let newProps = null;
            ({
                stepOffset = 1,
                ...newProps
            } = onGoNext(step, data));

            data = {
                ...data,
                ...newProps,
            };
        }

        const nextStep = step + stepOffset;
        const history = [...prevHistory];
        history[nextStep] = data;

        const newData = await this.runTasks(tasks);
        const {
            error,
        } = newData;
        if (error) {
            this.setState({
                loading: false,
                error: typeof error === 'string'
                    ? { message: error }
                    : error,
            });
            return;
        }

        this.setState({
            loading: false,
        });

        this.goToStep({
            step: nextStep,
            direction: '1',
            data: { ...data, ...newData },
            history,
        });
    }

    handleGoNext = () => {
        const {
            loading,
        } = this.state;
        if (loading) {
            return;
        }
        this.setState({ loading: true }, this.runAsyncTasks);
    };

    goToStep(state) {
        const {
            step,
            data,
        } = state;
        const {
            redirect,
        } = data;
        if (redirect) return;

        let newData = data;
        const {
            onStep,
            steps,
        } = this.props;
        if (onStep) {
            const newProps = onStep(step, data);
            newData = {
                ...newData,
                ...newProps,
            };
        }
        if (step === steps.length) {
            const {
                onExit,
                autoClose,
                closeDelay,
            } = this.props;

            if (onExit) {
                onExit(data);
            } else if (autoClose) {
                returnAndClose(data, closeDelay);
            }
            return;
        }

        this.setState({
            ...state,
            data: newData,
        });
    }

    async fetchInitialData() {
        const {
            fetchInitialData,
            initialData,
        } = this.props;
        if (!fetchInitialData) return;

        const newData = await fetchInitialData();
        const data = {
            ...initialData,
            ...newData,
        };
        this.goToStep({
            step: 0,
            data,
            history: [data],
            loading: false,
            pendingInitialFetch: false,
        });
    }

    getTask() {
        const {
            steps,
        } = this.props;
        const {
            step,
            currentTask,
        } = this.state;
        const {
            tasks = [],
        } = steps[step] || {};

        return tasks[currentTask];
    }

    getNextTask({ step, currentTask } = this.state) {
        const {
            steps,
        } = this.props;
        const {
            tasks = [],
        } = steps[step] || {};
        const task = tasks[currentTask + 1];

        if (!task && step < steps.length) {
            return this.getNextTask({
                step: step + 1,
                currentTask: -1,
            });
        }

        return {
            task,
            nextStep: step,
            nextTask: currentTask + 1,
        };
    }

    updateParentState = (childState) => {
        const {
            data: prevData,
        } = this.state;
        const {
            error: validationError,
            ...childData
        } = childState;
        this.setState({
            data: {
                ...prevData,
                ...childData,
            },
            validationError,
        });
    }

    runTasks = async (tasks) => {
        const {
            runTask,
        } = this.props;
        let {
            data,
        } = this.state;

        await asyncForEach(tasks, async (task) => {
            if (data.error) return;

            let response;
            const {
                run,
            } = task;
            try {
                response = run
                    ? await run(data)
                    : await runTask(task, data);
            } catch (error) {
                errorLog(error);
                response = {
                    error,
                };
            }

            data = {
                ...data,
                ...response,
            };
        });

        return data;
    };

    handleTransactionComplete = () => {
        const {
            goNext,
            autoClose,
            closeDelay,
        } = this.props;
        const {
            data,
        } = this.state;
        if (goNext) {
            goNext(data);
        } else if (autoClose) {
            returnAndClose(data, closeDelay);
        }
    };

    renderHeader() {
        const {
            steps,
        } = this.props;
        const {
            step,
        } = this.state;

        return (
            <Block padding="s s l s">
                <Block padding="xxs s xs s">
                    <Text
                        text={i18n.t(steps[step].titleKey)}
                        size="l"
                        weight="normal"
                    />
                </Block>
                <FlexBox
                    expand
                    direction="row"
                    align="center"
                >
                    {steps.length > 1 && steps.map(
                        (s, i) => (
                            <Block
                                key={+i}
                                background={i <= step ? 'primary' : 'primary-lightest'}
                                borderRadius="s"
                                padding="xxs l"
                                style={{
                                    margin: `${spacingMap.xs}`,
                                }}
                            />
                        ),
                    )
                    }
                </FlexBox>
            </Block>
        );
    }

    renderFooter = () => {
        const {
            steps,
        } = this.props;
        const {
            step,
            loading,
            error,
        } = this.state;

        return (
            <Footer
                cancelText={i18n.t(steps[step].cancelText)}
                nextText={i18n.t(steps[step].submitText)}
                loading={loading}
                error={error}
                onNext={this.handleGoNext}
                isNextExit={step === steps.length}
                onPrevious={this.handleGoBack}
            />
        );
    }

    renderContent({ content: Component }) {
        const {
            data,
            validationError,
        } = this.state;

        return (
            <Component
                {...data}
                error={validationError}
                updateParentState={this.updateParentState}
            />
        );
    }

    render() {
        const {
            steps,
        } = this.props;
        const {
            pendingInitialFetch,
            step,
            direction,
        } = this.state;
        if (pendingInitialFetch) {
            return <Loading />;
        }

        return (
            <FlexBox
                direction="column"
                expand
                stretch
                nowrap
            >
                <AnimatedContent
                    animationType="header"
                    className="flex-fixed"
                    direction={direction}
                    animationKey={step}
                >
                    {this.renderHeader(steps[step])}
                </AnimatedContent>
                <AnimatedContent
                    animationType="content"
                    direction={direction.toString()}
                    className="flex-free-expand"
                    animationKey={step}
                >
                    {this.renderContent(steps[step])}
                </AnimatedContent>
                <AnimatedContent
                    animationType="footer"
                    direction={direction}
                    className="flex-fixed"
                    animationKey={step}
                >
                    {this.renderFooter(steps[step])}
                </AnimatedContent>
            </FlexBox>
        );
    }
}

Transaction.propTypes = {
    content: PropTypes.node,
    steps: PropTypes.arrayOf(PropTypes.shape({
        title: PropTypes.string,
        titleKey: PropTypes.string,
        tasks: PropTypes.arrayOf(PropTypes.shape({
            name: PropTypes.string,
            type: PropTypes.string,
            loadingMessage: PropTypes.string,
            run: PropTypes.func,
        })),
        validate: PropTypes.func,
        cancelText: PropTypes.string,
        submitText: PropTypes.string,
    })).isRequired,
    successMessage: PropTypes.string,
    initialStep: PropTypes.number,
    initialTask: PropTypes.number,
    initialData: PropTypes.object, // eslint-disable-line react/forbid-prop-types
    runTask: PropTypes.func,
    goNext: PropTypes.func,
    goBack: PropTypes.func,
    onClose: PropTypes.func,
    autoStart: PropTypes.bool,
    autoClose: PropTypes.bool,
    closeDelay: PropTypes.number,
};

Transaction.defaultProps = {
    content: null,
    successMessage: '',
    initialStep: 0,
    initialTask: 0,
    initialData: {},
    runTask: null,
    goNext: null,
    goBack: null,
    onClose: null,
    autoStart: false,
    autoClose: false,
    closeDelay: closeWindowDelay,
};

export default Transaction;
